package com.xupt.agent.DTO;

import lombok.Data;

/** Agent 查询请求 */
@Data
public class AgentQueryRequest {

    /** 自然语言描述，如「我想要周杰伦的歌」「帮我找电影 星际穿越」 */
    private String message;

    /** 媒体类型：auto | music | video | book（默认 auto，自动识别） */
    private String type;

    /** 检索维度：auto | title | singer | author | actor | director（默认 auto） */
    private String by;

    /** 显式关键词，优先于 message 解析结果 */
    private String keyword;

    /** 页码，默认 1 */
    private Integer page;

    /** 每个来源返回的候选数量，默认取配置 */
    private Integer size;
}
