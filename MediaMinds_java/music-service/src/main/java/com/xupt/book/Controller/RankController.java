package com.xupt.book.Controller;

import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Rank;
import com.xupt.book.Service.RankService;
import com.xupt.book.Utils.ThreadLocalUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 歌单评分接口
 */
@RestController
@RequestMapping("/v1/music/rank")
@Tag(name = "歌单评分管理", description = "提供歌单评分的提交与查询接口")
public class RankController {

    @Resource
    private RankService rankService;

    @Operation(summary = "提交评分", description = "用户对歌单进行评分")
    @PostMapping
    public Result<?> addRank(@RequestBody Rank rank) {
        Map<String, Object> claims = ThreadLocalUtil.get();
        String userId = claims.get("userId").toString();
        rank.setUserId(userId);
        boolean res = rankService.addRank(rank);
        return res ? Result.success("评价成功") : Result.error("评价失败");
    }

    @Operation(summary = "获取歌单评分", description = "根据歌单 ID 查询该歌单的评分")
    @GetMapping("/{songListId}")
    public Result<Integer> rankOfSongListId(
            @Parameter(description = "歌单 ID", required = true) @PathVariable Long songListId) {
        int rank = rankService.rankOfSongListId(songListId);
        return Result.success(rank);
    }
}
