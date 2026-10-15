package com.xupt.agent.DTO;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

/** 结构化候选条目（统一酷狗 / TMDB / 豆瓣 三种来源） */
@Data
public class Candidate {

    /** 数据来源：kugou | tmdb | douban */
    private String source;

    /** 媒体类型：music | video | book */
    private String type;

    /** 来源内唯一 ID（酷狗 hash / TMDB id / 豆瓣 id） */
    private String sourceId;

    /** 标题 */
    private String title;

    /** 副标题：歌手 / 作者 / 导演 */
    private String subtitle;

    /** 封面地址 */
    private String cover;

    /** 年份 / 发行时间 */
    private String year;

    /** 评分 */
    private Double rate;

    /** 入库所需的归一化字段 */
    private Map<String, Object> extra = new LinkedHashMap<>();
}
