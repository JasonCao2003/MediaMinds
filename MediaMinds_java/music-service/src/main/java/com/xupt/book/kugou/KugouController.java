package com.xupt.book.kugou;

import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Song;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 酷狗音乐接入接口：搜索、在线播放直链、歌词、榜单、歌单、登录与导入本地曲库。
 * 统一前缀 /v1/music/kugou。
 */
@RestController
@RequestMapping("/v1/music/kugou")
@Tag(name = "酷狗音乐接入", description = "接入酷狗音乐：搜索、播放、歌词、榜单、歌单与导入本地曲库")
public class KugouController {

    private final KugouService kugouService;

    public KugouController(KugouService kugouService) {
        this.kugouService = kugouService;
    }

    // ================= 搜索 =================

    @Operation(summary = "搜索歌曲", description = "调用酷狗接口按关键词搜索歌曲")
    @GetMapping("/search")
    public Result<?> search(
            @Parameter(description = "关键词") @RequestParam String keyword,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页条数，默认30") @RequestParam(defaultValue = "30") int size) {
        return Result.success(kugouService.searchSongs(keyword, page, size));
    }

    // ================= 播放 / 歌词 =================

    @Operation(summary = "获取播放直链", description = "根据 hash 获取酷狗播放直链（需配置有效登录态）")
    @GetMapping("/url")
    public Result<?> playUrl(
            @Parameter(description = "歌曲 hash") @RequestParam String hash,
            @Parameter(description = "音质，默认128") @RequestParam(required = false) String quality,
            @Parameter(description = "album_audio_id") @RequestParam(required = false) String albumAudioId,
            @Parameter(description = "album_id") @RequestParam(required = false) String albumId) {
        return Result.success(kugouService.resolvePlayUrl(hash, quality, albumAudioId, albumId));
    }

    @Operation(summary = "获取歌词", description = "根据 hash 获取并解码酷狗歌词（KRC/LRC）")
    @GetMapping("/lyric")
    public Result<?> lyric(
            @Parameter(description = "歌曲 hash") @RequestParam String hash,
            @Parameter(description = "album_audio_id") @RequestParam(required = false) String albumAudioId,
            @Parameter(description = "关键词") @RequestParam(required = false) String keyword) {
        return Result.success(kugouService.getLyric(hash, albumAudioId, keyword));
    }

    // ================= 榜单 / 歌单 =================

    @Operation(summary = "获取榜单列表", description = "获取酷狗排行榜列表")
    @GetMapping("/rank/list")
    public Result<?> rankList() {
        return Result.success(kugouService.rankList());
    }

    @Operation(summary = "获取榜单歌曲", description = "分页获取指定榜单的歌曲")
    @GetMapping("/rank/audio")
    public Result<?> rankAudio(
            @Parameter(description = "榜单 ID") @RequestParam int rankId,
            @Parameter(description = "榜单分类 ID") @RequestParam(defaultValue = "0") int rankCid,
            @Parameter(description = "页码，默认1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页条数，默认30") @RequestParam(defaultValue = "30") int size) {
        return Result.success(kugouService.rankAudio(rankId, rankCid, page, size));
    }

    @Operation(summary = "获取推荐榜单", description = "获取酷狗推荐榜单")
    @GetMapping("/rank/top")
    public Result<?> rankTop() {
        return Result.success(kugouService.rankTop());
    }

    @Operation(summary = "获取热门歌单", description = "获取酷狗热门歌单")
    @GetMapping("/sheet/hot")
    public Result<?> sheetHot(
            @Parameter(description = "歌单类型，默认1") @RequestParam(defaultValue = "1") int opernType) {
        return Result.success(kugouService.sheetHot(opernType));
    }

    @Operation(summary = "获取歌单歌曲", description = "按起始索引分页获取歌单内歌曲")
    @GetMapping("/sheet/songs")
    public Result<?> sheetSongs(
            @Parameter(description = "global_collection_id") @RequestParam String collectionId,
            @Parameter(description = "起始索引") @RequestParam(defaultValue = "0") int beginIdx,
            @Parameter(description = "每页条数，默认30") @RequestParam(defaultValue = "30") int size) {
        return Result.success(kugouService.sheetSongs(collectionId, beginIdx, size));
    }

    // ================= 登录 =================

    @Operation(summary = "发送短信验证码", description = "向手机号发送酷狗登录验证码")
    @PostMapping("/login/sms/send")
    public Result<?> sendSmsCode(@Parameter(description = "手机号") @RequestParam String mobile) {
        return Result.success(kugouService.sendSmsCode(mobile));
    }

    @Operation(summary = "手机验证码登录", description = "返回 token/userid/dfid 等登录态，可写入 KUGOU_* 环境变量")
    @PostMapping("/login/sms")
    public Result<?> loginByMobile(@RequestBody Map<String, String> body) {
        String mobile = body.get("mobile");
        String code = body.get("code");
        if (mobile == null || code == null) {
            return Result.error("手机号和验证码不能为空");
        }
        return Result.success(kugouService.loginByMobile(mobile, code));
    }

    @Operation(summary = "获取登录二维码", description = "获取酷狗扫码登录二维码 key")
    @GetMapping("/login/qr")
    public Result<?> qrKey() {
        return Result.success(kugouService.qrKey());
    }

    @Operation(summary = "查询扫码状态", description = "轮询二维码扫描状态")
    @GetMapping("/login/qr/status")
    public Result<?> qrStatus(@Parameter(description = "二维码 key") @RequestParam String key) {
        return Result.success(kugouService.qrStatus(key));
    }

    // ================= 导入本地曲库 =================

    @Operation(summary = "导入歌曲到本地曲库", description = "将酷狗歌曲写入本地 song 表（自动创建歌手、写入歌词与封面，可选下载音频到 MinIO）")
    @PostMapping("/import")
    public Result<?> importSong(@RequestBody Map<String, Object> body) {
        String hash = str(body.get("hash"));
        String name = str(body.get("name"));
        String singer = str(body.get("singer"));
        String album = str(body.get("album"));
        String albumId = str(body.get("albumId"));
        String albumAudioId = str(body.get("albumAudioId"));
        String image = str(body.get("image"));
        Integer duration = body.get("duration") instanceof Number n ? n.intValue() : null;
        if (hash.isEmpty() || name.isEmpty()) {
            return Result.error("hash 和歌曲名称不能为空");
        }
        Song song = kugouService.importSong(hash, name, singer, album, albumId, albumAudioId, duration, image);
        return Result.success(song);
    }

    private static String str(Object value) {
        return value == null ? "" : value.toString();
    }
}
