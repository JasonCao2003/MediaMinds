package com.xupt.book.file;

/** 支持入库的图书文件格式 */
public enum BookFormat {

    EPUB("application/epub+zip", ".epub"),
    PDF("application/pdf", ".pdf"),
    CBZ("application/vnd.comicbook+zip", ".cbz");

    private final String contentType;
    private final String extension;

    BookFormat(String contentType, String extension) {
        this.contentType = contentType;
        this.extension = extension;
    }

    public String contentType() {
        return contentType;
    }

    public String extension() {
        return extension;
    }

    /** 按扩展名识别；不支持的格式返回 null */
    public static BookFormat fromFileName(String fileName) {
        if (fileName == null) {
            return null;
        }
        String lower = fileName.toLowerCase();
        for (BookFormat format : values()) {
            if (lower.endsWith(format.extension)) {
                return format;
            }
        }
        return null;
    }

    /**
     * 按 MIME 识别。
     *
     * <p>只作兜底：浏览器上报的 contentType 经常是 {@code application/octet-stream}，
     * 不可靠。**优先用扩展名**。
     */
    public static BookFormat fromContentType(String contentType) {
        if (contentType == null) {
            return null;
        }
        String lower = contentType.toLowerCase();
        for (BookFormat format : values()) {
            if (lower.contains(format.contentType)) {
                return format;
            }
        }
        return null;
    }
}
