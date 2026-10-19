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
 * 元数据入库：把用户选中的候选条目写回各自服务的本地库。
 *
 * <p>只入库元信息，媒体本体（视频 / 音乐 / 图书文件）不入库。
 */
@Service
public class MediaImporter {

    private final MusicClient musicClient;
    private final VideoClient videoClient;
    private final BookClient bookClient;

    public MediaImporter(MusicClient musicClient, VideoClient videoClient, BookClient bookClient) {
        this.musicClient = musicClient;
        this.videoClient = videoClient;
        this.bookClient = bookClient;
    }

    public Map<String, Object> importItems(List<Candidate> items) {
        List<Map<String, Object>> imported = new ArrayList<>();
        List<Map<String, Object>> failed = new ArrayList<>();
        if (items != null) {
            for (Candidate item : items) {
                if (item == null || Values.isBlank(item.getSource())) {
                    continue;
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("source", item.getSource());
                row.put("sourceId", item.getSourceId());
                row.put("title", item.getTitle());
                try {
                    Map<String, Object> resp = switch (item.getSource()) {
                        case "kugou" -> musicClient.kugouImport(kugouBody(item));
                        case "tmdb" -> videoClient.tmdbImport(Values.longOf(item.getSourceId()));
                        case "douban" -> bookClient.doubanImport(Values.longOf(item.getSourceId()));
                        default -> throw new IllegalArgumentException("未知数据源：" + item.getSource());
                    };
                    int code = (int) Values.longOf(resp.get("code"));
                    row.put("code", code);
                    row.put("message", resp.get("message"));
                    if (code >= 200 && code < 300) {
                        // 收藏 = 入库：导入成功后顺手加入收藏；取消收藏不会删除库里的内容
                        row.put("favorited", favorite(item.getSource(), resp));
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

    /**
     * 把刚导入的条目加入收藏。
     *
     * <p>失败不影响「已入库」的结果——最多只是没收藏上，用户可以在库中手动收藏。
     */
    @SuppressWarnings("unchecked")
    private boolean favorite(String source, Map<String, Object> importResponse) {
        Integer localId = localIdOf(source, importResponse);
        if (localId == null) {
            return false;
        }
        try {
            Map<String, Object> resp = switch (source) {
                case "kugou" -> musicClient.addCollection((byte) 0, localId);
                case "tmdb" -> videoClient.addFavorite(localId.longValue());
                case "douban" -> bookClient.addFavorite(Map.of("bookId", localId, "chapterId", 0));
                default -> null;
            };
            return resp != null && Values.longOf(resp.get("code")) >= 200 && Values.longOf(resp.get("code")) < 300;
        } catch (Exception e) {
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private Integer localIdOf(String source, Map<String, Object> response) {
        Object data = response == null ? null : response.get("data");
        if (!(data instanceof Map<?, ?> map)) {
            return null;
        }
        Object node = switch (source) {
            case "tmdb" -> map.get("movie");
            case "douban" -> map.get("book");
            default -> map;
        };
        if (node instanceof Map<?, ?> entity) {
            Object id = entity.get("id");
            if (id instanceof Number number) {
                return number.intValue();
            }
        }
        return null;
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
}
