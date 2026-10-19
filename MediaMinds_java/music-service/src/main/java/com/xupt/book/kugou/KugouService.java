package com.xupt.book.kugou;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.Mapper.SingerMapper;
import com.xupt.book.Mapper.SongMapper;
import com.xupt.book.Pojo.Singer;
import com.xupt.book.Pojo.Song;
import com.xupt.book.Utils.MinioUtil;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 酷狗业务编排：结果归一化、播放直链解析，以及把酷狗歌曲导入本地曲库。
 */
@Service
public class KugouService {

    private final KugouApiClient api;
    private final KugouProperties props;
    private final KugouAuthStore authStore;
    private final SongMapper songMapper;
    private final SingerMapper singerMapper;

    public KugouService(KugouApiClient api, KugouProperties props, KugouAuthStore authStore,
                        SongMapper songMapper, SingerMapper singerMapper) {
        this.api = api;
        this.props = props;
        this.authStore = authStore;
        this.songMapper = songMapper;
        this.singerMapper = singerMapper;
    }

    // ============================================================
    // 搜索
    // ============================================================

    /** 搜索歌曲，返回归一化列表 */
    public Map<String, Object> searchSongs(String keyword, int page, int size) {
        JsonNode raw = api.searchSong(keyword, page, size);
        List<Map<String, Object>> songs = new ArrayList<>();
        JsonNode lists = raw.path("data").path("lists");
        if (lists.isArray()) {
            for (JsonNode item : lists) {
                songs.add(normalizeSong(item));
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", raw.path("data").path("total").asInt(songs.size()));
        result.put("songs", songs);
        result.put("raw", raw);
        return result;
    }

    /** 搜索歌手（msearch 返回 data 直接是数组，且不含头像） */
    public Map<String, Object> searchSingers(String keyword, int page, int size) {
        JsonNode raw = api.searchSinger(keyword, page, size);
        List<Map<String, Object>> singers = new ArrayList<>();
        JsonNode arr = raw.path("data");
        if (arr.isArray()) {
            for (JsonNode item : arr) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", pick(item, "singerid", "SingerId", "singer_id"));
                m.put("name", pick(item, "singername", "SingerName", "name"));
                singers.add(m);
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", singers.size());
        result.put("singers", singers);
        return result;
    }

    /** 搜索专辑（msearch 返回 data.info[]） */
    public Map<String, Object> searchAlbums(String keyword, int page, int size) {
        JsonNode raw = api.searchAlbum(keyword, page, size);
        JsonNode data = raw.path("data");
        List<Map<String, Object>> albums = new ArrayList<>();
        JsonNode info = data.path("info");
        if (info.isArray()) {
            for (JsonNode item : info) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", pick(item, "albumid", "AlbumID", "album_id"));
                m.put("name", pick(item, "albumname", "AlbumName", "album_name"));
                m.put("singer", pick(item, "singername", "SingerName"));
                m.put("songCount", item.path("songcount").asInt(item.path("SongCount").asInt(0)));
                m.put("publishTime", pick(item, "publishtime", "PublishTime"));
                m.put("image", normalizeImage(pick(item, "imgurl", "Image", "image")));
                albums.add(m);
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", data.path("total").asInt(albums.size()));
        result.put("albums", albums);
        return result;
    }

    private Map<String, Object> normalizeSong(JsonNode item) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("hash", pick(item, "FileHash", "Hash", "filehash", "hash"));
        m.put("name", pick(item, "OriSongName", "SongName", "songname", "name", "FileName"));
        m.put("singer", pick(item, "SingerName", "singername"));
        m.put("album", pick(item, "AlbumName", "album_name"));
        m.put("albumId", pick(item, "AlbumID", "album_id"));
        m.put("albumAudioId", pick(item, "album_audio_id", "AlbumAudioId", "MixSongID", "mixsongid"));
        m.put("audioId", pick(item, "Audioid", "audio_id", "EMixSongID", "mixsongid"));
        m.put("duration", item.path("Duration").asInt(item.path("duration").asInt(0)));
        m.put("image", resolveImage(item));
        return m;
    }

    private String resolveImage(JsonNode item) {
        String direct = pick(item, "Image", "image", "cover", "album_image", "img");
        if (!direct.isEmpty()) {
            return normalizeImage(direct);
        }
        JsonNode trans = item.path("trans_param");
        if (trans.isObject()) {
            String cover = pick(trans, "union_cover", "copyright_cover", "album_image");
            if (!cover.isEmpty()) {
                return normalizeImage(cover);
            }
        }
        return "";
    }

    /** 酷狗图片地址含 {size} 占位符，替换为可用尺寸 */
    private static String normalizeImage(String url) {
        if (url == null || url.isEmpty()) {
            return "";
        }
        return url.replace("{size}", "240");
    }

    // ============================================================
    // 播放直链 / 歌词
    // ============================================================

    /** 获取播放直链，返回 { url, raw } */
    public Map<String, Object> resolvePlayUrl(String hash, String quality, String albumAudioId, String albumId) {
        JsonNode raw = api.getPlayUrl(hash, quality, albumAudioId, albumId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("url", extractPlayUrl(raw));
        m.put("raw", raw);
        return m;
    }

    private String extractPlayUrl(JsonNode raw) {
        JsonNode urlArray = raw.path("url");
        if (urlArray.isArray() && urlArray.size() > 0) {
            return urlArray.get(0).asText("");
        }
        JsonNode data = raw.path("data");
        if (data.isArray() && data.size() > 0) {
            return data.get(0).path("url").asText("");
        }
        if (data.isObject()) {
            JsonNode url = data.path("url");
            if (url.isArray() && url.size() > 0) {
                return url.get(0).asText("");
            }
            if (url.isTextual()) {
                return url.asText("");
            }
        }
        String direct = raw.path("url").asText("");
        return direct == null ? "" : direct;
    }

    public Map<String, Object> getLyric(String hash, String albumAudioId, String keyword) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("lyric", api.getLyricText(hash, albumAudioId, keyword));
        return m;
    }

    // ============================================================
    // 榜单 / 歌单
    // ============================================================

    public JsonNode rankList() {
        return api.getRankList(1);
    }

    public JsonNode rankAudio(int rankId, int rankCid, int page, int size) {
        return api.getRankAudio(rankId, rankCid, page, size);
    }

    public JsonNode rankTop() {
        return api.getRankTop();
    }

    public JsonNode sheetHot(int opernType) {
        return api.getSheetHot(opernType);
    }

    public JsonNode sheetSongs(String collectionId, int beginIdx, int size) {
        return api.getPlaylistSongs(collectionId, beginIdx, size);
    }

    // ============================================================
    // 登录
    // ============================================================

    public JsonNode sendSmsCode(String mobile) {
        return api.sendSmsCode(mobile);
    }

    public JsonNode loginByMobile(String mobile, String code) {
        JsonNode response = api.loginByMobile(mobile, code);
        applyLoginState(response);
        return response;
    }

    public JsonNode qrKey() {
        return api.getQrKey();
    }

    public JsonNode qrStatus(String key) {
        JsonNode response = api.checkQrStatus(key);
        applyLoginState(response);
        return response;
    }

    /**
     * 把登录接口返回的 token / userid / dfid / vip 信息写回进程内配置，
     * 后续搜索、播放直链、导入请求会立即带上登录态。
     */
    private void applyLoginState(JsonNode response) {
        if (response == null) {
            return;
        }
        JsonNode data = response.path("data");
        if (data.isMissingNode() || !data.isObject()) {
            return;
        }
        String token = text(data, "token", "user_token");
        if (token == null || token.isBlank()) {
            return;
        }
        String userId = text(data, "userid", "user_id");
        String dfid = text(data, "dfid");
        String vipToken = text(data, "vip_token", "viptoken");
        String vipType = text(data, "vip_type", "viptype");
        String refreshToken = text(data, "refresh_token", "refreshtoken");
        props.updateLoginState(token, userId, dfid, vipToken, vipType);
        // 落库，重启后自动恢复
        authStore.save(token, userId, dfid, vipToken, vipType, refreshToken);
    }

    /** 退出登录：清空内存与持久化的登录态 */
    public void logout() {
        authStore.clear();
    }

    /** 当前是否已登录 */
    public boolean isLoggedIn() {
        return props.getToken() != null && !props.getToken().isBlank();
    }

    /** 当前登录的 userid（未登录为 0） */
    public String currentUserId() {
        return props.getUserId();
    }

    private static String text(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode value = node.path(key);
            if (!value.isMissingNode() && !value.isNull()) {
                String text = value.asText("");
                if (!text.isBlank()) {
                    return text;
                }
            }
        }
        return null;
    }

    // ============================================================
    // 导入本地曲库
    // ============================================================

    /**
     * 把一首酷狗歌曲导入本地 song 表：自动创建歌手、写入歌词与封面，
     * 并按配置决定是否把音频下载到 MinIO。
     */
    public Song importSong(String hash, String name, String singerName, String albumName,
                           String albumId, String albumAudioId, Integer durationMs, String image) {
        if (hash == null || hash.isBlank() || name == null || name.isBlank()) {
            throw new IllegalArgumentException("hash 和歌曲名称不能为空");
        }

        Integer singerId = ensureSinger(singerName, image);

        // 同一首歌（同名 + 同歌手）只入库一次：重复导入（比如「加入歌单」前先导入）直接复用
        Song existing = songMapper.selectOne(new QueryWrapper<Song>()
                .eq("name", name)
                .eq("singer_id", singerId)
                .last("LIMIT 1"));
        if (existing != null) {
            // 老数据可能没有酷狗源信息，补上后播放时就能按需刷新直链
            if (existing.getKugouHash() == null || existing.getKugouHash().isBlank()) {
                existing.setKugouHash(hash);
                existing.setKugouAlbumId(blankToNull(albumId));
                existing.setKugouAlbumAudioId(blankToNull(albumAudioId));
                existing.setSource("kugou");
                existing.setUpdateTime(new Date());
                songMapper.updateById(existing);
            }
            return existing;
        }

        String lyric = "";
        try {
            lyric = api.getLyricText(hash, albumAudioId, name + " " + (singerName == null ? "" : singerName));
        } catch (Exception ignored) {
            // 歌词非必需
        }

        String pic = normalizeImage(image);
        if (pic.isEmpty()) {
            pic = resolvePlayUrlImageThumbnail(hash, albumAudioId);
        }

        String url = resolveAndStoreAudio(hash, albumId, albumAudioId);

        Song song = new Song();
        song.setSingerId(singerId);
        song.setName(name);
        song.setIntroduction(albumName);
        song.setLyric(lyric);
        song.setPic(pic);
        song.setUrl(url);
        song.setKugouHash(hash);
        song.setKugouAlbumId(blankToNull(albumId));
        song.setKugouAlbumAudioId(blankToNull(albumAudioId));
        song.setSource("kugou");
        song.setCreateTime(new Date());
        song.setUpdateTime(new Date());
        songMapper.insert(song);
        return song;
    }

    /**
     * 按歌曲 ID 重新解析酷狗播放直链并回写 song.url。
     *
     * <p>直链带时效，登录 / 会员状态变化后需要重新取；前端在播放前调用。
     */
    public String refreshSongUrl(Integer songId) {
        if (songId == null) {
            throw new IllegalArgumentException("歌曲 ID 不能为空");
        }
        Song song = songMapper.selectById(songId);
        if (song == null) {
            throw new IllegalArgumentException("歌曲不存在");
        }
        if (song.getKugouHash() == null || song.getKugouHash().isBlank()) {
            throw new IllegalStateException("该歌曲没有酷狗源信息，无法刷新播放地址");
        }
        String url;
        try {
            JsonNode raw = api.getPlayUrl(song.getKugouHash(), "128",
                    nvl(song.getKugouAlbumAudioId()), nvl(song.getKugouAlbumId()));
            url = extractPlayUrl(raw);
        } catch (Exception e) {
            throw new IllegalStateException("获取播放地址失败：" + e.getMessage());
        }
        if (url == null || url.isEmpty()) {
            throw new IllegalStateException("该曲目暂时拿不到播放地址（可能需要酷狗会员或重新登录）");
        }
        song.setUrl(url);
        song.setUpdateTime(new Date());
        songMapper.updateById(song);
        return url;
    }

    private static String nvl(String value) {
        return value == null || value.isBlank() ? "0" : value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String resolveAndStoreAudio(String hash, String albumId, String albumAudioId) {
        String playUrl;
        try {
            JsonNode raw = api.getPlayUrl(hash, "128", albumAudioId, albumId);
            playUrl = extractPlayUrl(raw);
        } catch (Exception e) {
            return "";
        }
        if (playUrl == null || playUrl.isEmpty()) {
            return "";
        }
        if (!props.isImportDownloadAudio()) {
            return playUrl;
        }
        try {
            byte[] bytes = api.download(playUrl);
            String extension = playUrl.toLowerCase().contains(".flac") ? ".flac" : ".mp3";
            return MinioUtil.UploadFile(UUID.randomUUID() + extension, new ByteArrayInputStream(bytes));
        } catch (Exception e) {
            // 下载失败则退回临时直链
            return playUrl;
        }
    }

    private String resolvePlayUrlImageThumbnail(String hash, String albumAudioId) {
        return "";
    }

    private Integer ensureSinger(String singerName, String image) {
        String name = (singerName == null || singerName.isBlank()) ? "未知歌手" : singerName.trim();
        Singer singer = singerMapper.selectOne(new QueryWrapper<Singer>().eq("name", name).last("LIMIT 1"));
        if (singer != null) {
            return singer.getId();
        }
        Singer created = new Singer();
        created.setName(name);
        created.setSex((byte) 0);
        created.setPic(image == null ? "" : image);
        created.setIntroduction("来自酷狗音乐的歌手");
        singerMapper.insert(created);
        Singer saved = singerMapper.selectOne(new QueryWrapper<Singer>().eq("name", name).last("LIMIT 1"));
        return saved != null ? saved.getId() : created.getId();
    }

    // ============================================================
    // 工具
    // ============================================================

    private static String pick(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode value = node.get(key);
            if (value != null && !value.isNull()) {
                String s = value.asText("");
                if (!s.isEmpty()) {
                    return s;
                }
            }
        }
        return "";
    }
}
