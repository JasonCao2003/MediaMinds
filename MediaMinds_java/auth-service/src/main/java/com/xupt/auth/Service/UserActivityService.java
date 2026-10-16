package com.xupt.auth.Service;

import com.xupt.auth.DTO.ActivityAnnualDTO;
import com.xupt.auth.DTO.ActivityRow;
import com.xupt.auth.DTO.ActivitySummaryDTO;
import com.xupt.auth.Mapper.UserActivityMapper;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * 媒体消费时长统计。
 *
 * <p>口径：只统计「真的在消费内容」的时间——阅读器页面可见、视频播放中、音乐播放中。
 * 暂停、切走标签页、关闭页面都不计（由前端的上报时机保证）。
 */
@Slf4j
@Service
public class UserActivityService {

    /** 合法的媒体类型 */
    public static final Set<String> MEDIA_TYPES = Set.of("book", "music", "video");

    /** 单次上报的秒数上限（防止前端异常值污染统计） */
    private static final int MAX_REPORT_SECONDS = 3600;

    private static final LocalDate MIN_DATE = LocalDate.of(1970, 1, 1);
    private static final LocalDate MAX_DATE = LocalDate.of(9999, 12, 31);

    @Resource
    private UserActivityMapper activityMapper;

    /** 上报一段消费时长，累加到今天该类型上 */
    public void report(String userId, String mediaType, Integer seconds) {
        if (userId == null || mediaType == null || seconds == null) return;
        if (!MEDIA_TYPES.contains(mediaType)) {
            log.warn("忽略未知媒体类型的时长上报：{}", mediaType);
            return;
        }
        if (seconds <= 0) return;

        int safe = Math.min(seconds, MAX_REPORT_SECONDS);
        activityMapper.addDuration(userId, LocalDate.now(), mediaType, safe);
    }

    /** 汇总：各时间范围 + 每日明细 + 连续天数 + 可选年份 */
    public ActivitySummaryDTO summary(String userId, int dailyDays) {
        LocalDate today = LocalDate.now();
        int days = Math.min(Math.max(dailyDays, 7), 366);

        ActivitySummaryDTO dto = new ActivitySummaryDTO();
        dto.setToday(rangeOf(userId, today, today));
        dto.setWeek(rangeOf(userId, today.with(DayOfWeek.MONDAY), today));
        dto.setMonth(rangeOf(userId, today.withDayOfMonth(1), today));
        dto.setYear(rangeOf(userId, today.withDayOfYear(1), today));
        dto.setAll(rangeOf(userId, MIN_DATE, MAX_DATE));
        dto.setDaily(dailyOf(userId, today.minusDays(days - 1L), today));

        List<LocalDate> active = activityMapper.activeDates(userId);
        dto.setTotalActiveDays(active.size());
        dto.setFirstActiveDate(active.isEmpty() ? null : active.get(active.size() - 1).toString());

        int[] streaks = streaks(active);
        dto.setCurrentStreak(streaks[0]);
        dto.setLongestStreak(streaks[1]);

        // 可选年份：只列出真正有记录的年份
        TreeSet<Integer> years = new TreeSet<>(Collections.reverseOrder());
        for (LocalDate d : active) years.add(d.getYear());
        if (years.isEmpty()) years.add(today.getYear());
        dto.setYears(new ArrayList<>(years));

        return dto;
    }

    /** 某个自然年的聚合（供年度报告使用） */
    public ActivityAnnualDTO annual(String userId, int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);

        ActivityAnnualDTO dto = new ActivityAnnualDTO();
        dto.setYear(year);

        ActivitySummaryDTO.Range range = rangeOf(userId, from, to);
        dto.setTotalSeconds(range.getTotal());
        dto.setBookSeconds(range.getBook());
        dto.setMusicSeconds(range.getMusic());
        dto.setVideoSeconds(range.getVideo());

        List<ActivitySummaryDTO.Day> daily = dailyOf(userId, from, to);
        dto.setDaily(daily);

        long[] monthly = new long[12];
        int activeDays = 0;
        String busiestDay = null;
        long busiestDaySeconds = 0;
        List<LocalDate> activeInYear = new ArrayList<>();

        for (ActivitySummaryDTO.Day day : daily) {
            if (day.getTotal() <= 0) continue;
            activeDays++;
            activeInYear.add(LocalDate.parse(day.getDate()));

            int monthIndex = Integer.parseInt(day.getDate().substring(5, 7)) - 1;
            monthly[monthIndex] += day.getTotal();

            if (day.getTotal() > busiestDaySeconds) {
                busiestDaySeconds = day.getTotal();
                busiestDay = day.getDate();
            }
        }

        int busiestMonth = 0;
        long busiestMonthSeconds = 0;
        for (int i = 0; i < 12; i++) {
            if (monthly[i] > busiestMonthSeconds) {
                busiestMonthSeconds = monthly[i];
                busiestMonth = i + 1;
            }
        }

        List<Long> monthlyList = new ArrayList<>(12);
        for (long v : monthly) monthlyList.add(v);

        dto.setMonthlySeconds(monthlyList);
        dto.setActiveDays(activeDays);
        dto.setBusiestMonth(busiestMonth);
        dto.setBusiestMonthSeconds(busiestMonthSeconds);
        dto.setBusiestDay(busiestDay);
        dto.setBusiestDaySeconds(busiestDaySeconds);
        dto.setLongestStreak(longestRun(activeInYear));
        dto.setFirstActiveDate(activeInYear.isEmpty() ? null : activeInYear.get(0).toString());

        return dto;
    }

    /** 某个日期区间的三类型时长 */
    private ActivitySummaryDTO.Range rangeOf(String userId, LocalDate from, LocalDate to) {
        ActivitySummaryDTO.Range range = new ActivitySummaryDTO.Range();
        for (ActivityRow row : activityMapper.sumByType(userId, from, to)) {
            long seconds = row.getSeconds() == null ? 0L : row.getSeconds();
            switch (row.getMediaType()) {
                case "book" -> range.setBook(range.getBook() + seconds);
                case "music" -> range.setMusic(range.getMusic() + seconds);
                case "video" -> range.setVideo(range.getVideo() + seconds);
                default -> { /* 忽略历史脏数据 */ }
            }
        }
        range.setTotal(range.getBook() + range.getMusic() + range.getVideo());
        return range;
    }

    /** 每日明细：区间内没有记录的日期补 0，前端可直接画图 */
    private List<ActivitySummaryDTO.Day> dailyOf(String userId, LocalDate from, LocalDate to) {
        Map<String, ActivitySummaryDTO.Day> byDate = new LinkedHashMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            ActivitySummaryDTO.Day day = new ActivitySummaryDTO.Day();
            day.setDate(d.toString());
            byDate.put(day.getDate(), day);
        }

        for (ActivityRow row : activityMapper.dailyDetail(userId, from, to)) {
            if (row.getStatDate() == null) continue;
            ActivitySummaryDTO.Day day = byDate.get(row.getStatDate().toString());
            if (day == null) continue;
            long seconds = row.getSeconds() == null ? 0L : row.getSeconds();
            switch (row.getMediaType()) {
                case "book" -> day.setBook(day.getBook() + seconds);
                case "music" -> day.setMusic(day.getMusic() + seconds);
                case "video" -> day.setVideo(day.getVideo() + seconds);
                default -> { /* 忽略 */ }
            }
            day.setTotal(day.getBook() + day.getMusic() + day.getVideo());
        }
        return new ArrayList<>(byDate.values());
    }

    /**
     * 计算连续使用天数。
     *
     * @return [当前连续, 历史最长]
     */
    private int[] streaks(List<LocalDate> descDates) {
        if (descDates.isEmpty()) return new int[] {0, 0};

        // 历史最长：升序后找最长连续段
        List<LocalDate> asc = new ArrayList<>(descDates);
        Collections.reverse(asc);
        int longest = longestRun(asc);

        // 当前连续：从今天（或昨天）往回数
        LocalDate today = LocalDate.now();
        LocalDate cursor = descDates.get(0);
        int current = 0;
        if (cursor.equals(today) || cursor.equals(today.minusDays(1))) {
            current = 1;
            for (int i = 1; i < descDates.size(); i++) {
                if (descDates.get(i).equals(cursor.minusDays(1))) {
                    current++;
                    cursor = descDates.get(i);
                } else {
                    break;
                }
            }
        }
        return new int[] {current, longest};
    }

    /** 一组升序日期里最长的连续天数 */
    private int longestRun(List<LocalDate> ascDates) {
        if (ascDates.isEmpty()) return 0;
        int longest = 1;
        int run = 1;
        for (int i = 1; i < ascDates.size(); i++) {
            run = ascDates.get(i).minusDays(1).equals(ascDates.get(i - 1)) ? run + 1 : 1;
            longest = Math.max(longest, run);
        }
        return longest;
    }
}
