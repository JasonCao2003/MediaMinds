package com.xupt.auth.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.auth.DTO.ActivityRow;
import com.xupt.auth.Pojo.UserActivity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface UserActivityMapper extends BaseMapper<UserActivity> {

    /**
     * 累加时长：当天该类型已有记录则累加，否则插入。
     * 依赖唯一键 uk_user_date_type。
     */
    @Insert("""
            INSERT INTO user_activity (user_id, stat_date, media_type, duration_seconds)
            VALUES (#{userId}, #{statDate}, #{mediaType}, #{seconds})
            ON DUPLICATE KEY UPDATE duration_seconds = duration_seconds + #{seconds}
            """)
    int addDuration(@Param("userId") String userId,
                    @Param("statDate") LocalDate statDate,
                    @Param("mediaType") String mediaType,
                    @Param("seconds") int seconds);

    /** 指定日期区间内按媒体类型汇总（不分组日期） */
    @Select("""
            SELECT media_type AS mediaType, SUM(duration_seconds) AS seconds
            FROM user_activity
            WHERE user_id = #{userId} AND stat_date BETWEEN #{from} AND #{to}
            GROUP BY media_type
            """)
    List<ActivityRow> sumByType(@Param("userId") String userId,
                                @Param("from") LocalDate from,
                                @Param("to") LocalDate to);

    /** 指定日期区间内按「日期 × 媒体类型」明细，用于柱状图 */
    @Select("""
            SELECT stat_date AS statDate, media_type AS mediaType, SUM(duration_seconds) AS seconds
            FROM user_activity
            WHERE user_id = #{userId} AND stat_date BETWEEN #{from} AND #{to}
            GROUP BY stat_date, media_type
            ORDER BY stat_date
            """)
    List<ActivityRow> dailyDetail(@Param("userId") String userId,
                                  @Param("from") LocalDate from,
                                  @Param("to") LocalDate to);

    /** 所有「有时长」的日期，倒序 —— 用于计算连续使用天数与可选年份 */
    @Select("""
            SELECT DISTINCT stat_date
            FROM user_activity
            WHERE user_id = #{userId} AND duration_seconds > 0
            ORDER BY stat_date DESC
            """)
    List<LocalDate> activeDates(@Param("userId") String userId);

    /** 最早一条记录的时间（用于「累计天数」） */
    @Select("""
            SELECT MIN(stat_date)
            FROM user_activity
            WHERE user_id = #{userId} AND duration_seconds > 0
            """)
    LocalDate firstActiveDate(@Param("userId") String userId);
}
