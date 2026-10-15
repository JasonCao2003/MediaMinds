package com.xupt.agent.Service;

import com.xupt.agent.Client.BookClient;
import com.xupt.agent.Client.MusicClient;
import com.xupt.agent.Client.VideoClient;
import com.xupt.agent.DTO.Candidate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Agent 编排：
 *  1) 解析意图 → 2) 调取对应数据源 → 3) 归一化为统一候选结构 → 4) 用户选择后批量入库元数据。
 */
@Service
public class AgentService {

    private final MusicClient musicClient;
    private final BookClient bookClient;
    private final VideoClient videoClient;
    private final IntentParser intentParser;

    @Value("${agent.page-size:10}")
    private int defaultPageSize;

    @Value("${agent.music-size:20}")
    private int defaultMusicSize;

    public AgentService(MusicClient musicClient, BookClient bookClient, VideoClient videoClient,
                        IntentParser intentParser) {
        this.musicClient = musicClient;
        this.bookClient = bookClient;
        this.videoClient = videoClient;
        this.intentParser = intentParser;
    }

    // ============================================================
    // 查询
    // ============================================================

    public Map<String, Object> query(String message, String typeHint, String byHint,
                                     String keywordHint, Integer page, Integer size) {
        IntentParser.Intent intent = intentParser.parse(message, typeHint, byHint, keywordHint);
        int pageNo = page == null || page < 1 ? 1 : page;
        int pageSize = size == null || size < 1 ? defaultPageSize : size;

        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Object> intentMap = new LinkedHashMap<>();
        intentMap.put("type", intent.type());
        intentMap.put("by", intent.by());
        intentMap.put("keyword", intent.keyword());
        result.put("intent", intentMap);

        if (intent.keyword().isBlank()) {
            result.put("groups", Collections.emptyList());
            result.put("hint", "没能识别出关键词，换个说法试试，例如「我想要周杰伦的歌」或「帮我找电影 星际穿越」。");
            return result;
        }

        boolean all = "auto".equalsIgnoreCase(intent.type());
        List<Map<String, Object>> groups = new ArrayList<>();
        if (all || "music".equals(intent.type())) {
            groups.add(searchMusic(intent.keyword(), pageNo, all ? Math.min(6, pageSize) : defaultMusicSize));
        }
        if (all || "video".equals(intent.type())) {
            groups.add(searchVideo(intent.keyword(), intent.by(), pageNo, all ? Math.min(6, pageSize) : pageSize));
        }
        if (all || "book".equals(intent.type())) {
            groups.add(searchBook(intent.keyword(), pageNo, all ? Math.min(6, pageSize) : pageSize));
        }
        result.put("groups", groups);
        return result;
    }

    private Map<String, Object> searchMusic(String keyword, int page, int size) {
        Map<String, Object> group = group("music", "kugou", "酷狗音乐");
        try {
            Map<String, Object> resp = musicClient.kugouSearch(keyword, page, size);
            Map<String, Object> data = asMap(resp.get("data"));
            List<Object> songs = asList(data.get("songs"));
            List<Candidate> candidates = new ArrayList<>();
            for (Object item : songs) {
                Map<String, Object> s = asMap(item);
                Candidate c = new Candidate();
                c.setSource("kugou");
                c.setType("music");
                c.setSourceId(str(s.get("hash")));
                c.setTitle(str(s.get("name")));
                c.setSubtitle(str(s.get("singer")));
                c.setCover(str(s.get("image")));
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
                if (c.getSourceId() != null && !c.getSourceId().isBlank()) {
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

    private Map<String, Object> searchVideo(String keyword, String by, int page, int size) {
        Map<String, Object> group = group("video", "tmdb", "TMDB");
        try {
            Map<String, Object> resp;
            if ("actor".equals(by) || "director".equals(by)) {
                Map<String, Object> personResp = videoClient.tmdbPersonSearch(keyword, 1);
                Map<String, Object> personData = asMap(personResp.get("data"));
                List<Object> people = asList(personData.get("results"));
                if (people.isEmpty()) {
                    group.put("candidates", Collections.emptyList());
                    group.put("hint", "没有找到匹配的" + ("director".equals(by) ? "导演" : "演员") + "：" + keyword);
                    return group;
                }
                Map<String, Object> person = asMap(people.get(0));
                long personId = longOf(person.get("id"));
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
            Map<String, Object> data = asMap(resp.get("data"));
            String imageBase = str(data.get("imageBase"));
            String posterSize = str(data.get("posterSize"));
            List<Object> results = asList(data.get("results"));
            List<Candidate> candidates = new ArrayList<>();
            for (Object item : results) {
                Map<String, Object> m = asMap(item);
                Candidate c = new Candidate();
                c.setSource("tmdb");
                c.setType("video");
                c.setSourceId(str(m.get("id")));
                c.setTitle(str(m.get("title")));
                c.setSubtitle(str(m.get("original_title")));
                String poster = str(m.get("poster_path"));
                c.setCover(poster.isBlank() ? "" : imageBase + posterSize + poster);
                String release = str(m.get("release_date"));
                c.setYear(release.length() >= 4 ? release.substring(0, 4) : release);
                c.setRate(doubleOf(m.get("vote_average")));
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

    private Map<String, Object> searchBook(String keyword, int page, int size) {
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
            Map<String, Object> data = asMap(resp.get("data"));
            List<Object> results = asList(data.get("results"));
            List<Candidate> candidates = new ArrayList<>();
            for (Object item : results) {
                Map<String, Object> b = asMap(item);
                Candidate c = new Candidate();
                c.setSource("douban");
                c.setType("book");
                c.setSourceId(str(b.get("id")));
                c.setTitle(str(b.get("title")));
                String author = str(b.get("author"));
                String publisher = str(b.get("publisher"));
                c.setSubtitle(author.isBlank() ? publisher : (publisher.isBlank() ? author : author + " · " + publisher));
                c.setCover(str(b.get("cover")));
                c.setYear(str(b.get("year")));
                c.setRate(doubleOf(b.get("rating")));
                Map<String, Object> extra = new LinkedHashMap<>();
                extra.put("doubanId", b.get("id"));
                extra.put("title", b.get("title"));
                extra.put("author", b.get("author"));
                extra.put("abstract", b.get("abstract"));
                c.setExtra(extra);
                if (!c.getSourceId().isBlank()) {
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

    // ============================================================
    // 入库（仅元信息；媒体本体不入库）
    // ============================================================

    public Map<String, Object> importItems(List<Candidate> items) {
        List<Map<String, Object>> imported = new ArrayList<>();
        List<Map<String, Object>> failed = new ArrayList<>();
        if (items != null) {
            for (Candidate item : items) {
                if (item == null || item.getSource() == null) {
                    continue;
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("source", item.getSource());
                row.put("sourceId", item.getSourceId());
                row.put("title", item.getTitle());
                try {
                    Map<String, Object> resp = switch (item.getSource()) {
                        case "kugou" -> musicClient.kugouImport(kugouBody(item));
                        case "tmdb" -> videoClient.tmdbImport(longOf(item.getSourceId()));
                        case "douban" -> bookClient.doubanImport(longOf(item.getSourceId()));
                        default -> throw new IllegalArgumentException("未知数据源：" + item.getSource());
                    };
                    int code = (int) longOf(resp.get("code"));
                    row.put("code", code);
                    row.put("message", resp.get("message"));
                    if (code >= 200 && code < 300) {
                        imported.add(row);
                    } else {
                        failed.add(row);
                    }
                } catch (Exception e) {
                    row.put("code", 500);
                    row.put("message", e.getMessage());
                    failed.add(row);
                }
            }
        }
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("imported", imported);
        summary.put("failed", failed);
        summary.put("importedCount", imported.size());
        summary.put("failedCount", failed.size());
        return summary;
    }

    private Map<String, Object> kugouBody(Candidate item) {
        Map<String, Object> extra = item.getExtra() == null ? Collections.emptyMap() : item.getExtra();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("hash", value(extra, "hash", item.getSourceId()));
        body.put("name", value(extra, "name", item.getTitle()));
        body.put("singer", value(extra, "singer", item.getSubtitle()));
        body.put("album", value(extra, "album", ""));
        body.put("albumId", value(extra, "albumId", ""));
        body.put("albumAudioId", value(extra, "albumAudioId", ""));
        body.put("image", value(extra, "image", item.getCover()));
        body.put("duration", extra.getOrDefault("duration", 0));
        return body;
    }

    private static Object value(Map<String, Object> map, String key, Object fallback) {
        Object v = map.get(key);
        if (v == null || String.valueOf(v).isBlank()) {
            return fallback == null ? "" : fallback;
        }
        return v;
    }

    private static Map<String, Object> group(String type, String source, String label) {
        Map<String, Object> g = new LinkedHashMap<>();
        g.put("type", type);
        g.put("source", source);
        g.put("label", label);
        g.put("candidates", Collections.emptyList());
        return g;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        return o instanceof Map ? (Map<String, Object>) o : Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    private static List<Object> asList(Object o) {
        return o instanceof List ? (List<Object>) o : Collections.emptyList();
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static long longOf(Object o) {
        if (o instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(str(o));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private static Double doubleOf(Object o) {
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(str(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
