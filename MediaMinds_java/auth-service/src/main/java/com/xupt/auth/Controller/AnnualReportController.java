package com.xupt.auth.Controller;

import com.xupt.auth.DTO.AnnualReportDTO;
import com.xupt.auth.DTO.Result;
import com.xupt.auth.Service.UserAnnualReportService;
import com.xupt.auth.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

/**
 * 年度报告的保存与读取。
 *
 * <p>生成由 agent-service 负责，这里只做持久化：按「用户 × 年份」保存，
 * 重新生成时覆盖同一行。
 */
@RestController
@RequestMapping("/v1/auth/report")
public class AnnualReportController {

    @Resource
    private UserAnnualReportService reportService;

    private String currentUserId() {
        Map<String, Object> claims = ThreadLocalUtil.get();
        return claims == null ? null : (String) claims.get("userId");
    }

    /** 保存 / 覆盖某年度的报告，返回落库后的版本（含最近生成时间） */
    @PostMapping("/annual")
    public Result<AnnualReportDTO> save(@RequestBody AnnualReportDTO report) {
        String userId = currentUserId();
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        int year = report != null && report.getYear() > 0 ? report.getYear() : LocalDate.now().getYear();
        reportService.save(userId, report);
        return Result.success(reportService.load(userId, year));
    }

    /** 读取已保存的年度报告；没有生成过则 data 为 null */
    @GetMapping("/annual")
    public Result<AnnualReportDTO> load(@RequestParam(defaultValue = "0") int year) {
        String userId = currentUserId();
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        int target = year > 0 ? year : LocalDate.now().getYear();
        return Result.success(reportService.load(userId, target));
    }
}
