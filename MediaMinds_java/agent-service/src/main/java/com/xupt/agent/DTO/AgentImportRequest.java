package com.xupt.agent.DTO;

import lombok.Data;

import java.util.List;

/** Agent 批量入库请求 */
@Data
public class AgentImportRequest {

    /** 用户勾选的候选条目 */
    private List<Candidate> items;
}
