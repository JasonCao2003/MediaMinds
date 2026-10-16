package com.xupt.auth.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xupt.auth.Pojo.UserAnnualReport;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserAnnualReportMapper extends BaseMapper<UserAnnualReport> {

    /**
     * 写入或覆盖某年度的报告。
     * 依赖唯一键 uk_user_year —— 重新生成时覆盖同一行，不会堆积历史版本。
     */
    @Insert("""
            INSERT INTO user_annual_report
                (user_id, report_year, engine, model, headline, sections, fallback_reason)
            VALUES
                (#{userId}, #{reportYear}, #{engine}, #{model}, #{headline}, #{sections}, #{fallbackReason})
            ON DUPLICATE KEY UPDATE
                engine = VALUES(engine),
                model = VALUES(model),
                headline = VALUES(headline),
                sections = VALUES(sections),
                fallback_reason = VALUES(fallback_reason)
            """)
    int upsert(@Param("userId") String userId,
               @Param("reportYear") int reportYear,
               @Param("engine") String engine,
               @Param("model") String model,
               @Param("headline") String headline,
               @Param("sections") String sections,
               @Param("fallbackReason") String fallbackReason);

    /** 读取某年度的报告，没有则返回 null */
    @Select("""
            SELECT id, user_id AS userId, report_year AS reportYear, engine, model,
                   headline, sections, fallback_reason AS fallbackReason, updated_at AS updatedAt
            FROM user_annual_report
            WHERE user_id = #{userId} AND report_year = #{reportYear}
            """)
    UserAnnualReport findByYear(@Param("userId") String userId,
                                @Param("reportYear") int reportYear);
}
