package com.xupt.book.kugou;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 酷狗 HTTP 客户端：负责参数合并、签名、请求发送，以及各类酷狗接口调用。
 * 对齐参考项目 KuGou.Net 的 KgHttpTransport + SignatureHandler + Raw*Api。
 */
@Service
public class KugouApiClient {

    /** 签名类型 */
    public enum Sig {
        /** v3/v4 常规签名 */
        DEFAULT,
        /** v5 播放链接专用 */
        V5,
        /** 扫码登录等 Web 接口 */
        WEB,
        /** 不签名 */
        NONE
    }

    private final KugouProperties props;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public KugouApiClient(KugouProperties props) {
        this.props = props;
    }

    // ============================================================
    // 底层请求
    // ============================================================

    private JsonNode execute(String httpMethod, String baseUrl, String path,
                             Map<String, String> params, Object body, Sig sig,
                             String router, Map<String, String> customHeaders,
                             boolean clearDefaults, boolean notSign, String dfidOverride) {
        Map<String, String> merged = new LinkedHashMap<>();
        if (params != null) {
            merged.putAll(params);
        }

        String dfid = dfidOverride != null ? dfidOverride : props.getDfid();
        if (dfid == null || dfid.isBlank()) {
            dfid = "-";
        }
        String mid = KugouCrypto.calcNewMid(dfid);
        String uuid = KugouCrypto.md5(dfid + mid);

        if (!clearDefaults) {
            merged.putIfAbsent("appid", KugouProperties.APP_ID);
            merged.putIfAbsent("clientver", KugouProperties.CLIENT_VER);
            merged.putIfAbsent("dfid", dfid);
            merged.putIfAbsent("mid", mid);
            merged.putIfAbsent("uuid", uuid);
            merged.putIfAbsent("userid", props.getUserId());
            merged.putIfAbsent("clienttime", String.valueOf(Instant.now().getEpochSecond()));
            if (!merged.containsKey("token") && !props.getToken().isEmpty()) {
                merged.put("token", props.getToken());
            }
        }

        if (sig == Sig.V5 && merged.containsKey("hash")) {
            String paramMid = merged.getOrDefault("mid", mid);
            merged.put("key", KugouCrypto.v5Key(merged.get("hash"),
                    merged.getOrDefault("userid", props.getUserId()), paramMid));
        }

        String jsonBody = "";
        if ("POST".equals(httpMethod) && body != null) {
            try {
                jsonBody = objectMapper.writeValueAsString(body);
            } catch (Exception e) {
                throw new IllegalStateException("请求体序列化失败", e);
            }
        }

        if (!notSign && sig != Sig.NONE) {
            String signature = (sig == Sig.WEB)
                    ? KugouCrypto.webSignature(merged)
                    : KugouCrypto.defaultSignature(merged, jsonBody);
            if (!signature.isEmpty()) {
                merged.put("signature", signature);
            }
        }

        StringBuilder url = new StringBuilder(baseUrl.replaceAll("/+$", ""))
                .append('/').append(path.replaceAll("^/+", ""));
        if (!merged.isEmpty()) {
            url.append('?');
            boolean first = true;
            for (Map.Entry<String, String> e : merged.entrySet()) {
                if (!first) {
                    url.append('&');
                }
                first = false;
                url.append(urlEncode(e.getKey())).append('=').append(urlEncode(e.getValue()));
            }
        }

        HttpRequest.Builder rb = HttpRequest.newBuilder(URI.create(url.toString()));
        rb.header("User-Agent", KugouProperties.USER_AGENT);
        rb.header("dfid", dfid);
        rb.header("mid", mid);
        if (merged.containsKey("clienttime")) {
            rb.header("clienttime", merged.get("clienttime"));
        }
        rb.header("kg-rc", "1");
        rb.header("kg-thash", "5d816a0");
        rb.header("kg-rec", "1");
        rb.header("kg-rf", "B9EDA08A64250DEFFBCADDEE00F8F25F");
        if (router != null && !router.isBlank()) {
            rb.header("x-router", router);
        }
        if (customHeaders != null) {
            customHeaders.forEach(rb::header);
        }

        if ("POST".equals(httpMethod)) {
            rb.header("Content-Type", "application/json");
            rb.POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8));
        } else {
            rb.GET();
        }

        try {
            HttpResponse<String> resp = httpClient.send(rb.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.body() == null || resp.body().isEmpty()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(resp.body());
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("酷狗接口请求失败: " + e.getMessage(), e);
        }
    }

    private JsonNode get(String baseUrl, String path, Map<String, String> params, Sig sig, String router) {
        return execute("GET", baseUrl, path, params, null, sig, router, null, false, false, null);
    }

    private JsonNode post(String baseUrl, String path, Map<String, String> params, Object body, Sig sig,
                          String router, Map<String, String> headers, boolean clearDefaults) {
        return execute("POST", baseUrl, path, params, body, sig, router, headers, clearDefaults, false, null);
    }

    private static String urlEncode(String value) {
        if (value == null) {
            return "";
        }
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    /** 下载任意 URL 的字节内容（用于音频/封面） */
    public byte[] download(String url) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(props.getDownloadTimeoutSeconds()))
                    .header("User-Agent", KugouProperties.USER_AGENT)
                    .GET().build();
            HttpResponse<byte[]> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());
            return resp.body();
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("下载资源失败: " + e.getMessage(), e);
        }
    }

    // ============================================================
    // 搜索
    // ============================================================

    /** 搜索歌曲 */
    public JsonNode searchSong(String keyword, int page, int pageSize) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("keyword", keyword);
        params.put("page", String.valueOf(page));
        params.put("pagesize", String.valueOf(pageSize));
        params.put("platform", "AndroidFilter");
        params.put("iscorrection", "1");
        return get("https://complexsearch.kugou.com", "/v3/search/song", params, Sig.DEFAULT,
                "complexsearch.kugou.com");
    }

    /** 热搜词 */
    public JsonNode searchHot() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("navid", "1");
        params.put("plat", "2");
        return get("https://msearch.kugou.com", "/api/v3/search/hot_tab", params, Sig.DEFAULT,
                "msearch.kugou.com");
    }

    // ============================================================
    // 播放链接
    // ============================================================

    /** 获取播放直链（需登录态） */
    public JsonNode getPlayUrl(String hash, String quality, String albumAudioId, String albumId) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("album_id", albumId == null ? "0" : albumId);
        params.put("area_code", "1");
        params.put("hash", hash.toLowerCase());
        params.put("ssa_flag", "is_fromtrack");
        params.put("version", KugouProperties.VERSION);
        params.put("page_id", "967177915");
        params.put("quality", quality == null ? "128" : quality);
        params.put("album_audio_id", albumAudioId == null ? "0" : albumAudioId);
        params.put("behavior", "play");
        params.put("pid", "411");
        params.put("cmd", "26");
        params.put("pidversion", "3001");
        params.put("IsFreePart", "0");
        params.put("ppage_id", "356753938,823673182,967485191");
        params.put("cdnBackup", "1");
        params.put("kcard", "0");
        params.put("module", "");
        params.put("clientver", KugouProperties.CLIENT_VER);
        return execute("GET", "https://trackercdn.kugou.com", "/v5/url", params, null, Sig.V5,
                null, null, false, false, props.getDfid());
    }

    // ============================================================
    // 歌词
    // ============================================================

    public JsonNode searchLyric(String hash, String albumAudioId, String keyword, String man) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("album_audio_id", albumAudioId == null ? "0" : albumAudioId);
        params.put("appid", KugouProperties.APP_ID);
        params.put("clientver", KugouProperties.CLIENT_VER);
        params.put("duration", "0");
        params.put("hash", hash == null ? "" : hash);
        params.put("keyword", keyword == null ? "" : keyword);
        params.put("lrctxt", "1");
        params.put("man", man == null ? "no" : man);
        JsonNode result = get("https://lyrics.kugou.com", "/v1/search", params, Sig.DEFAULT, null);
        if (result.path("candidates").isArray() && result.path("candidates").size() > 0) {
            return result;
        }
        Map<String, String> legacy = new LinkedHashMap<>();
        legacy.put("ver", "1");
        legacy.put("man", "yes");
        legacy.put("client", "pc");
        legacy.put("duration", "0");
        legacy.put("hash", hash == null ? "" : hash);
        legacy.put("keyword", keyword == null ? "" : keyword);
        return get("https://lyrics.kugou.com", "/search", legacy, Sig.DEFAULT, null);
    }

    public JsonNode downloadLyric(String id, String accessKey, String fmt) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("ver", "1");
        params.put("client", "android");
        params.put("id", id);
        params.put("accesskey", accessKey);
        params.put("fmt", fmt == null ? "krc" : fmt);
        params.put("charset", "utf8");
        return get("https://lyrics.kugou.com", "/download", params, Sig.DEFAULT, "lyrics.kugou.com");
    }

    /** 搜索并下载歌词，返回纯文本（自动解码 KRC） */
    public String getLyricText(String hash, String albumAudioId, String keyword) {
        JsonNode search = searchLyric(hash, albumAudioId, keyword, "no");
        JsonNode candidates = search.path("candidates");
        if (!candidates.isArray() || candidates.size() == 0) {
            return "";
        }
        JsonNode candidate = candidates.get(0);
        String id = candidate.path("id").asText("");
        String accessKey = candidate.path("accesskey").asText("");
        String fmt = candidate.path("fmt").asText("krc");
        JsonNode download = downloadLyric(id, accessKey, fmt);
        String content = download.path("content").asText("");
        if (content.isEmpty()) {
            return "";
        }
        if ("krc".equalsIgnoreCase(fmt)) {
            String decoded = KugouCrypto.decodeKrcLyrics(content);
            return decoded.isEmpty() ? "" : decoded;
        }
        // lrc：内容通常为 Base64，失败则按明文返回
        try {
            return new String(java.util.Base64.getDecoder().decode(content), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return content;
        }
    }

    // ============================================================
    // 榜单
    // ============================================================

    public JsonNode getRankList(int withSong) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("plat", "2");
        params.put("withsong", String.valueOf(withSong));
        params.put("parentid", "0");
        return get("https://gateway.kugou.com", "/ocean/v6/rank/list", params, Sig.DEFAULT, null);
    }

    public JsonNode getRankAudio(int rankId, int rankCid, int page, int pageSize) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("show_portrait_mv", 1);
        body.put("show_type_total", 1);
        body.put("filter_original_remarks", 1);
        body.put("area_code", 1);
        body.put("pagesize", pageSize);
        body.put("rank_cid", rankCid);
        body.put("type", 1);
        body.put("page", page);
        body.put("rank_id", rankId);
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("kg-tid", "369");
        return post("https://gateway.kugou.com", "/openapi/kmr/v2/rank/audio", null, body,
                Sig.DEFAULT, null, headers, false);
    }

    public JsonNode getRankTop() {
        return get("https://gateway.kugou.com", "/mobileservice/api/v5/rank/rec_rank_list", null,
                Sig.DEFAULT, null);
    }

    // ============================================================
    // 歌单
    // ============================================================

    public JsonNode getSheetHot(int opernType) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("srcappid", "2919");
        params.put("opern_type", String.valueOf(opernType));
        return get("https://gateway.kugou.com", "/miniyueku/v1/opern_square/get_home_hot_opern",
                params, Sig.WEB, null);
    }

    public JsonNode getSheetDetail(String id, String source) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("id", id);
        params.put("source", source);
        return get("https://miniyueku.kugou.com", "/v1/opern/detail", params, Sig.DEFAULT, null);
    }

    /** 获取歌单内歌曲（beginIdx 为起始索引） */
    public JsonNode getPlaylistSongs(String globalCollectionId, int beginIdx, int pageSize) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("area_code", "1");
        params.put("begin_idx", String.valueOf(beginIdx));
        params.put("plat", "1");
        params.put("type", "1");
        params.put("mode", "1");
        params.put("personal_switch", "1");
        params.put("extend_fields", "abtags,hot_cmt,popularization");
        params.put("pagesize", String.valueOf(pageSize));
        params.put("global_collection_id", globalCollectionId);
        return get("https://gateway.kugou.com", "/pubsongs/v2/get_other_list_file_nofilt", params,
                Sig.DEFAULT, null);
    }

    // ============================================================
    // 登录（手机验证码 / 扫码）
    // ============================================================

    public JsonNode sendSmsCode(String mobile) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("businessid", 5);
        body.put("mobile", mobile);
        body.put("plat", 3);
        return post("http://login.user.kugou.com", "/v7/send_mobile_code", null, body,
                Sig.DEFAULT, "login.user.kugou.com", null, false);
    }

    public JsonNode loginByMobile(String mobile, String code) {
        long dateTime = System.currentTimeMillis();
        String t1 = KugouCrypto.aesEncryptHex("|" + dateTime,
                KugouProperties.LITE_T1_KEY, KugouProperties.LITE_T1_IV);
        String t2Raw = props.getInstallGuid() + "|" + KugouProperties.T2_FIXED_HASH + "|"
                + props.getInstallMac() + "|" + props.getInstallDev() + "|" + dateTime;
        String t2 = KugouCrypto.aesEncryptHex(t2Raw,
                KugouProperties.LITE_T2_KEY, KugouProperties.LITE_T2_IV);

        Map<String, Object> aesPayload = new LinkedHashMap<>();
        aesPayload.put("mobile", mobile);
        aesPayload.put("code", code);
        String[] enc;
        try {
            enc = KugouCrypto.aesEncryptRandom(objectMapper.writeValueAsString(aesPayload));
        } catch (Exception e) {
            throw new IllegalStateException("登录参数加密失败", e);
        }
        String aesStr = enc[0];
        String aesKey = enc[1];

        Map<String, Object> pkData = new LinkedHashMap<>();
        pkData.put("clienttime_ms", dateTime);
        pkData.put("key", aesKey);
        String pk;
        try {
            pk = KugouCrypto.rsaEncryptNoPaddingUpper(objectMapper.writeValueAsString(pkData));
        } catch (Exception e) {
            throw new IllegalStateException("登录 pk 加密失败", e);
        }

        String maskedMobile = mobile.length() > 10
                ? mobile.substring(0, 2) + "*****" + mobile.charAt(10)
                : mobile;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("plat", 1);
        body.put("support_multi", 1);
        body.put("t1", t1);
        body.put("t2", t2);
        body.put("clienttime_ms", dateTime);
        body.put("mobile", maskedMobile);
        body.put("key", KugouCrypto.loginKey(dateTime));
        body.put("pk", pk);
        body.put("params", aesStr);
        body.put("dfid", "-");
        body.put("dev", props.getInstallDev());
        body.put("gitversion", "5f0b7c4");

        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("support-calm", "1");

        JsonNode response = post("https://loginserviceretry.kugou.com", "/v7/login_by_verifycode",
                null, body, Sig.DEFAULT, "login.user.kugou.com", headers, false);
        return decryptSecuParams(response, aesKey);
    }

    public JsonNode getQrKey() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("appid", "1001");
        params.put("clientver", "11040");
        params.put("type", "1");
        params.put("plat", "4");
        params.put("srcappid", "2919");
        params.put("qrcode_txt",
                "https://h5.kugou.com/apps/loginQRCode/html/index.html?appid=3116&");
        return get("https://login-user.kugou.com", "/v2/qrcode", params, Sig.WEB, null);
    }

    public JsonNode checkQrStatus(String key) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("plat", "4");
        params.put("appid", "3116");
        params.put("srcappid", "2919");
        params.put("qrcode", key);
        return get("https://login-user.kugou.com", "/v2/get_userinfo_qrcode", params, Sig.WEB, null);
    }

    /** 用返回的 aesKey 解密 secu_params 并合并进 data 节点 */
    private JsonNode decryptSecuParams(JsonNode response, String aesKey) {
        try {
            if (response.path("status").asInt() == 1 && response.path("data").has("secu_params")) {
                String secu = response.path("data").path("secu_params").asText("");
                if (!secu.isEmpty()) {
                    String decrypted = KugouCrypto.aesDecryptHex(secu, aesKey);
                    JsonNode decryptedNode = objectMapper.readTree(decrypted);
                    if (response instanceof ObjectNode root
                            && root.path("data") instanceof ObjectNode dataNode
                            && decryptedNode.isObject()) {
                        decryptedNode.fields().forEachRemaining(e -> dataNode.set(e.getKey(), e.getValue()));
                        return root;
                    }
                }
            }
        } catch (Exception ignored) {
            // 解密失败时返回原始响应
        }
        return response;
    }
}
