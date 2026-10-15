package com.xupt.agent.DTO;

import lombok.Data;

/** Agent 多轮对话请求 */
@Data
public class AgentChatRequest {

    /** 会话 ID：同一次会话保持上下文，可追问「第 3 个也入库」；为空则自动创建 */
    private String sessionId;

    /** 用户本轮的自然语言输入 */
    private String message;

    /** 可选：媒体类型 music | video | book */
    private String type;

    /** 可选：检索维度 title | singer | author | actor | director */
    private String by;

    /** 可选：显式关键词 */
    private String keyword;
}
