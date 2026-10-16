package com.xupt.auth.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xupt.auth.DTO.AnnualReportDTO;
import com.xupt.auth.Mapper.UserAnnualReportMapper;
import com.xupt.auth.Pojo.UserAnnualReport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * 年度报告的持久化。
 *
 * <p>报告由 agent-service 生成、前端回传，这里只负责「按年覆盖保存」与「读出来还原」。
 * 保存时用 upsert，重新生成不会堆积历史版本。
 */
@Slf4j
@Service
public class UserAnnualReportService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final UserAnnualReportMapper reportMapper;
    private final ObjectMapper objectMapper;

    public UserAnnualReportService(UserAnnualReportMapper reportMapper, ObjectMapper objectMapper) {
        this.reportMapper = reportMapper;
        this.objectMapper = objectMapper;
    }

    /** 保存或覆盖某年度的报告 */
    public void save(String userId, AnnualReportDTO report) {
        if (report == null) return;

        int year = report.getYear() > 0 ? report.getYear() : LocalDate.now().getYear();

        String sectionsJson;
        try {
            List<AnnualReportDTO.Section> sections =
                    report.getSections() == null ? List.of() : report.getSections();
            sectionsJson = objectMapper.writeValueAsString(sections);
        } catch (JsonProcessingException e) {
            log.warn("年度报告板块序列化失败，将保存为空：{}", e.getMessage());
            sectionsJson = "[]";
        }

        reportMapper.upsert(
                userId,
                year,
                report.getEngine() == null || report.getEngine().isBlank() ? "rule" : report.getEngine(),
                report.getModel(),
                report.getHeadline(),
                sectionsJson,
                report.getError());
    }

    /** 读取某年度的报告，没有则返回 null */
    public AnnualReportDTO load(String userId, int year) {
        UserAnnualReport row = reportMapper.findByYear(userId, year);
        if (row == null) return null;

        AnnualReportDTO dto = new AnnualReportDTO();
        dto.setYear(row.getReportYear() == null ? year : row.getReportYear());
        dto.setEngine(row.getEngine());
        dto.setModel(row.getModel());
        dto.setHeadline(row.getHeadline());
        dto.setError(row.getFallbackReason());
        dto.setUpdatedAt(row.getUpdatedAt() == null ? null : row.getUpdatedAt().format(TIMESTAMP));

        List<AnnualReportDTO.Section> sections = new ArrayList<>();
        String json = row.getSections();
        if (json != null && !json.isBlank()) {
            try {
                sections = objectMapper.readValue(
                        json,
                        objectMapper.getTypeFactory()
                                .constructCollectionType(List.class, AnnualReportDTO.Section.class));
            } catch (JsonProcessingException e) {
                log.warn("年度报告板块反序列化失败，将返回空板块：{}", e.getMessage());
            }
        }
        dto.setSections(sections);
        return dto;
    }
}
