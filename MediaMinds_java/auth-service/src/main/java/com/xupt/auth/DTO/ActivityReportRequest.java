package com.xupt.auth.DTO;

import lombok.Data;

/** 前端上报的媒体消费时长 */
@Data
public class ActivityReportRequest {

    /** book / music / video */
    private String mediaType;

    /** 本次上报的增量秒数 */
    private Integer seconds;
}
