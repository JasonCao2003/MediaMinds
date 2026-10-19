package com.xupt.book.file;

import com.xupt.book.Pojo.Book;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 抽取结果 → {@code book} 实体。
 *
 * <p>BookDrop 这类「没有用户确认、直接把磁盘文件入库」的流程用它：
 * 由文件里抽到的元数据构造一条初始记录。
 */
public final class MetadataToBook {

    private MetadataToBook() {
    }

    public static Book toBook(ExtractedMetadata meta, String fallbackName, String source) {
        Book book = new Book();
        String name = meta == null ? null : meta.getBookName();
        book.setBookName(name == null || name.isBlank() ? fallbackName : name);

        if (meta != null) {
            book.setSubtitle(blankToNull(meta.getSubtitle()));
            book.setBookAuthor(blankToNull(meta.getBookAuthor()));
            book.setPublisher(blankToNull(meta.getPublisher()));
            book.setBookDetails(blankToNull(meta.getBookDetails()));
            book.setIsbn13(blankToNull(meta.getIsbn13()));
            book.setIsbn10(blankToNull(meta.getIsbn10()));
            book.setLanguage(blankToNull(meta.getLanguage()));
            book.setPageCount(meta.getPageCount());
            book.setChapterCount(meta.getChapterCount());
            book.setSeriesName(blankToNull(meta.getSeriesName()));
            book.setPublishedDate(parseDate(meta.getPublishedDate()));
            if (meta.getSeriesNumber() != null && !meta.getSeriesNumber().isBlank()) {
                try {
                    book.setSeriesNumber(new BigDecimal(meta.getSeriesNumber().trim()));
                } catch (NumberFormatException ignored) {
                    // 系列号认不出就留空
                }
            }
        }
        if (book.getChapterCount() == null) {
            book.setChapterCount(0);
        }
        book.setSource(source);
        return book;
    }

    private static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
