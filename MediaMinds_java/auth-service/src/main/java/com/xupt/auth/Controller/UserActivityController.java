package com.xupt.auth.Controller;

import com.xupt.auth.DTO.ActivityAnnualDTO;
import com.xupt.auth.DTO.ActivityReportRequest;
import com.xupt.auth.DTO.ActivitySummaryDTO;
import com.xupt.auth.DTO.Result;
import com.xupt.auth.Service.UserActivityService;
import com.xupt.auth.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 媒体消费时长统计接口。
 *
 * <p>时长由前端在「真的在消费内容」时上报（阅读器可见 / 视频播放中 / 音乐播放中），
 * 后端只做累加与聚合，不判断业务语义。
 */
@RestController
@RequestMapping("/v1/auth/activity")
public class UserActivityController {

    @Resource
    private UserActivityService activityService;

    /** 用户 ID 由网关从 JWT 解析后写入 X-UserId，拦截器放进 ThreadLocal */
    private String currentUserId() {
        Map<String, Object> claims = ThreadLocalUtil.get();
        return claims == null ? null : (String) claims.get("userId");
    }

    @PostMapping("/report")
    public Result<?> report(@RequestBody ActivityReportRequest request) {
        String userId = currentUserId();
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        activityService.report(userId, request.getMediaType(), request.getSeconds());
        return Result.success();
    }

    @GetMapping("/annual")
    public Result<ActivityAnnualDTO> annual(@RequestParam(defaultValue = "0") int year) {
        String userId = currentUserId();
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        int target = year > 0 ? year : java.time.LocalDate.now().getYear();
        return Result.success(activityService.annual(userId, target));
    }

    @GetMapping("/summary")
    public Result<ActivitySummaryDTO> summary(@RequestParam(defaultValue = "30") int days) {
        String userId = currentUserId();
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        return Result.success(activityService.summary(userId, days));
    }
}
