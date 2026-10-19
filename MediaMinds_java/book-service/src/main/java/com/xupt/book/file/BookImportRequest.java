package com.xupt.book.file;

import com.xupt.book.Pojo.Book;
import lombok.Data;

/** 用暂存文件入库的请求体 */
@Data
public class BookImportRequest {

    /** 暂存令牌（{@code POST /v1/book/file/staging} 返回的） */
    private String token;

    /** 元数据；id 会被忽略（本接口总是新建记录） */
    private Book book;

    /** 书没有封面时，是否采用从文件里抽取的封面。默认采用 */
    private boolean useExtractedCover = true;

    /** 入库后是否自动拆分 EPUB / PDF 章节（只写指针，不复制正文）。默认开启 */
    private boolean generateChapters = true;
}
