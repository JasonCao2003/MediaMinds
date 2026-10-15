package com.xupt.agent.Service;

import com.xupt.agent.Client.BookClient;
import com.xupt.agent.Client.MusicClient;
import com.xupt.agent.Client.VideoClient;
import com.xupt.agent.DTO.Candidate;
import com.xupt.agent.Util.Values;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 跨数据源检索：把酷狗音乐 / TMDB 影视 / 豆瓣图书的原始响应归一化为统一的候选结构。
 *
 * <p>被两条链路共用：
 * <ul>
 *   <li>LangChain4j Agent 的 {@code @Tool}（由大模型决定何时检索）</li>
 *   <li>规则式兜底链路（大模型不可用时）</li>
 * </ul>
 */
@Service
public class MediaSearchService {

    private final MusicClient musicClient;
    private final BookClient bookClient;
    private final VideoClient videoClient;

    public MediaSearchService(MusicClient musicClient, BookClient bookClient, VideoClient videoClient) {
        this.musicClient = musicClient;
        this.bookClient = bookClient;
        this.videoClient = videoClient;
    }

    /** 音乐：酷狗 */
    public Map<String, Object> searchMusic(String keyword, int page, int size) {
        Map<String, Object> group = group("music", "kugou", "酷狗音乐");
        try {
            Map<String, Object> resp = musicClient.kugouSearch(keyword, page, size);
            Map<String, Object> data = Values.asMap(resp.get("data"));
            List<Candidate> candidates = new ArrayList<>();
            for (Object item : Values.asList(data.get("songs"))) {
                Map<String, Object> s = Values.asMap(item);
                Candidate c = new Candidate();
                c.setSource("kugou");
                c.setType("music");
                c.setSourceId(Values.str(s.get("hash")));
                c.setTitle(Values.str(s.get("name")));
                c.setSubtitle(Values.str(s.get("singer")));
                c.setCover(Values.str(s.get("image")));
                c.setYear("");
                c.setRate(null);
                Map<String, Object> extra = new LinkedHashMap<>();
                extra.put("hash", s.get("hash"));
                extra.put("name", s.get("name"));
                extra.put("singer", s.get("singer"));
                extra.put("album", s.get("album"));
                extra.put("albumId", s.get("albumId"));
                extra.put("albumAudioId", s.get("albumAudioId"));
                extra.put("image", s.get("image"));
                extra.put("duration", s.get("duration"));
                c.setExtra(extra);
                if (!Values.isBlank(c.getSourceId())) {
                    candidates.add(c);
                }
            }
            group.put("total", data.get("total"));
            group.put("candidates", candidates);
        } catch (Exception e) {
            group.put("error", e.getMessage());
            group.put("candidates", Collections.emptyList());
        }
        return group;
    }

    /**
     * 影视：TMDB。{@code by} 为 actor / director 时先按人物检索再取其作品。
     */
    public Map<String, Object> searchVideo(String keyword, String by, int page, int size) {
        boolean byPerson = "actor".equals(by) || "director".equals(by);
        Map<String, Object> group = group("video", "tmdb", byPerson ? "TMDB · 人物作品" : "TMDB · 片名");
        try {
            Map<String, Object> resp;
            if (byPerson) {
                Map<String, Object> personResp = videoClient.tmdbPersonSearch(keyword, 1);
                Map<String, Object> personData = Values.asMap(personResp.get("data"));
                List<Object> people = Values.asList(personData.get("results"));
                if (people.isEmpty()) {
                    group.put("candidates", Collections.emptyList());
                    group.put("hint", "没有找到匹配的" + ("director".equals(by) ? "导演" : "演员") + "：" + keyword);
                    return group;
                }
                Map<String, Object> person = Values.asMap(people.get(0));
                long personId = Values.longOf(person.get("id"));
                Map<String, Object> personInfo = new LinkedHashMap<>();
                personInfo.put("id", personId);
                personInfo.put("name", person.get("name"));
                personInfo.put("role", by);
                personInfo.put("profile", person.get("profile_path"));
                group.put("person", personInfo);
                resp = videoClient.tmdbPersonMovies(personId, by, page);
            } else {
                resp = videoClient.tmdbSearch(keyword, page);
            }
            Map<String, Object> data = Values.asMap(resp.get("data"));
            String imageBase = Values.str(data.get("imageBase"));
            String posterSize = Values.str(data.get("posterSize"));
            List<Candidate> candidates = new ArrayList<>();
            for (Object item : Values.asList(data.get("results"))) {
                Map<String, Object> m = Values.asMap(item);
                Candidate c = new Candidate();
                c.setSource("tmdb");
                c.setType("video");
                c.setSourceId(Values.str(m.get("id")));
                c.setTitle(Values.str(m.get("title")));
                c.setSubtitle(Values.str(m.get("original_title")));
                String poster = Values.str(m.get("poster_path"));
                c.setCover(poster.isBlank() ? "" : imageBase + posterSize + poster);
                String release = Values.str(m.get("release_date"));
                c.setYear(release.length() >= 4 ? release.substring(0, 4) : release);
                c.setRate(Values.doubleOf(m.get("vote_average")));
                Map<String, Object> extra = new LinkedHashMap<>();
                extra.put("tmdbId", m.get("id"));
                extra.put("title", m.get("title"));
                extra.put("overview", m.get("overview"));
                c.setExtra(extra);
                candidates.add(c);
            }
            group.put("total", data.get("totalResults"));
            group.put("candidates", candidates);
        } catch (Exception e) {
            group.put("error", e.getMessage());
            group.put("candidates", Collections.emptyList());
        }
        return group;
    }

    /** 图书：豆瓣 */
    public Map<String, Object> searchBook(String keyword, int page, int size) {
        Map<String, Object> group = group("book", "douban", "豆瓣图书");
        try {
            // 豆瓣搜索接口偶发超时，做一次重试
            Map<String, Object> resp = null;
            Exception last = null;
            for (int attempt = 0; attempt < 2 && resp == null; attempt++) {
                try {
                    resp = bookClient.doubanSearch(keyword, page);
                } catch (Exception e) {
                    last = e;
                }
            }
            if (resp == null) {
                throw last == null ? new IllegalStateException("书源暂时不可用") : last;
            }
            Map<String, Object> data = Values.asMap(resp.get("data"));
            List<Candidate> candidates = new ArrayList<>();
            for (Object item : Values.asList(data.get("results"))) {
                Map<String, Object> b = Values.asMap(item);
                Candidate c = new Candidate();
                c.setSource("douban");
                c.setType("book");
                c.setSourceId(Values.str(b.get("id")));
                c.setTitle(Values.str(b.get("title")));
                String author = Values.str(b.get("author"));
                String publisher = Values.str(b.get("publisher"));
                c.setSubtitle(author.isBlank() ? publisher
                        : (publisher.isBlank() ? author : author + " · " + publisher));
                c.setCover(Values.str(b.get("cover")));
                c.setYear(Values.str(b.get("year")));
                c.setRate(Values.doubleOf(b.get("rating")));
                Map<String, Object> extra = new LinkedHashMap<>();
                extra.put("doubanId", b.get("id"));
                extra.put("title", b.get("title"));
                extra.put("author", b.get("author"));
                extra.put("abstract", b.get("abstract"));
                c.setExtra(extra);
                if (!Values.isBlank(c.getSourceId())) {
                    candidates.add(c);
                }
            }
            group.put("total", data.get("count"));
            group.put("candidates", candidates);
        } catch (Exception e) {
            group.put("error", e.getMessage());
            group.put("candidates", Collections.emptyList());
        }
        return group;
    }

    public static Map<String, Object> group(String type, String source, String label) {
        Map<String, Object> g = new LinkedHashMap<>();
        g.put("type", type);
        g.put("source", source);
        g.put("label", label);
        g.put("candidates", Collections.emptyList());
        return g;
    }
}
