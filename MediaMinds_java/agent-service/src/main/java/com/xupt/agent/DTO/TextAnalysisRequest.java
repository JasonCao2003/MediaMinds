package com.xupt.agent.DTO;

import lombok.Data;

/**
 * 歌词 / 阅读段落分析请求。
 *
 * <p>{@code kind} 取 {@code lyric}（歌词情感）或 {@code passage}（阅读内容）。
 * 前端只传选中的文本与少量上下文，后端不跨服务取数。
 */
@Data
public class TextAnalysisRequest {

    /** lyric = 歌词情感分析；passage = 阅读内容分析 */
    private String kind;

    /** 歌曲名 / 书名等，仅用于让提示词有上下文 */
    private String title;

    /** 歌手 / 作者 / 章节名等补充信息 */
    private String context;

    /** 待分析文本 */
    private String text;
}
