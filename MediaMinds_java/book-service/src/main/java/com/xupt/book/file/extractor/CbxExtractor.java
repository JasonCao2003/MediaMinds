package com.xupt.book.file.extractor;

import com.xupt.book.file.BookFileExtractor;
import com.xupt.book.file.BookFormat;
import com.xupt.book.file.CoverImage;
import com.xupt.book.file.ExtractSupport;
import com.xupt.book.file.ExtractedMetadata;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipFile;

/**
 * CBZ（漫画 / 图集）元数据抽取。
 *
 * <p>CBZ 就是「一堆图片 + 可选的 {@code ComicInfo.xml}」打的 ZIP。
 * 有 ComicInfo.xml 就以它为准，没有则从文件名猜系列与卷号。
 *
 * <p>页序按**自然序**排（{@code page2 < page10}）——纯字典序会把第 10 页排到第 2 页前面。
 */
@Component
public class CbxExtractor implements BookFileExtractor {

    private static final String COMIC_INFO = "comicinfo.xml";

    /** 从文件名里拆「系列名 + 卷号」，如 "三体 v01.cbz" / "Saga #003.cbz" */
    private static final Pattern FILE_NAME_PATTERN =
            Pattern.compile("^(.*?)[\\s_\\-#]*v?(\\d+(?:\\.\\d+)?)$", Pattern.CASE_INSENSITIVE);

    @Override
    public BookFormat format() {
        return BookFormat.CBZ;
    }

    @Override
    public ExtractedMetadata extract(Path file) throws Exception {
        try (ZipFile zip = new ZipFile(file.toFile())) {
            ExtractedMetadata meta = new ExtractedMetadata();
            List<String> pages = listPages(zip);
            meta.setChapterCount(pages.size());
            meta.setPageCount(pages.size());
            if (pages.isEmpty()) {
                meta.note("压缩包里没有找到图片");
            }

            Document comicInfo = loadComicInfo(zip);
            if (comicInfo != null) {
                meta.setBookName(ExtractSupport.firstText(comicInfo, "Title"));
                meta.setSeriesName(ExtractSupport.firstText(comicInfo, "Series"));
                meta.setSeriesNumber(ExtractSupport.firstText(comicInfo, "Number"));
                meta.setBookAuthor(firstNonBlank(
                        ExtractSupport.firstText(comicInfo, "Writer"),
                        ExtractSupport.firstText(comicInfo, "Penciller")));
                meta.setPublisher(ExtractSupport.firstText(comicInfo, "Publisher"));
                meta.setBookDetails(ExtractSupport.stripHtml(ExtractSupport.firstText(comicInfo, "Summary")));
                meta.setLanguage(ExtractSupport.firstText(comicInfo, "LanguageISO"));
                meta.setPublishedDate(comicDate(comicInfo));
                String[] isbn = ExtractSupport.splitIsbn(ExtractSupport.firstText(comicInfo, "ISBN"));
                meta.setIsbn13(isbn[0]);
                meta.setIsbn10(isbn[1]);

                String declaredPages = ExtractSupport.firstText(comicInfo, "PageCount");
                if (declaredPages != null) {
                    try {
                        meta.setPageCount(Integer.valueOf(declaredPages.trim()));
                    } catch (NumberFormatException ignored) {
                        // 声明值不合法就用实际图片数
                    }
                }
            } else {
                meta.note("未找到 ComicInfo.xml，元数据从文件名推断");
            }

            // 标题兜底：ComicInfo 没给 Title 时用系列名，再不行用文件名
            if (isBlank(meta.getBookName())) {
                meta.setBookName(firstNonBlank(meta.getSeriesName(), fileNameWithoutExt(file)));
            }
            // 系列/卷号兜底：从文件名拆
            if (isBlank(meta.getSeriesName()) || isBlank(meta.getSeriesNumber())) {
                Matcher matcher = FILE_NAME_PATTERN.matcher(fileNameWithoutExt(file));
                if (matcher.matches()) {
                    if (isBlank(meta.getSeriesName())) {
                        meta.setSeriesName(matcher.group(1).trim());
                    }
                    if (isBlank(meta.getSeriesNumber())) {
                        meta.setSeriesNumber(matcher.group(2));
                    }
                }
            }

            meta.setHasCover(!pages.isEmpty());
            return meta;
        }
    }

    @Override
    public CoverImage extractCover(Path file) throws Exception {
        try (ZipFile zip = new ZipFile(file.toFile())) {
            List<String> pages = listPages(zip);
            if (pages.isEmpty()) {
                return null;
            }
            // 页序已按自然序排好，第一页就是封面
            String first = pages.get(0);
            byte[] data = ExtractSupport.readEntry(zip, first);
            if (data == null || data.length == 0) {
                return null;
            }
            return new CoverImage(data, ExtractSupport.mimeFromName(first),
                    ExtractSupport.extensionFromName(first));
        }
    }

    /** 列出所有图片 entry，按自然序排序 */
    public static List<String> listPages(ZipFile zip) {
        List<String> pages = new ArrayList<>();
        for (String name : ExtractSupport.listEntries(zip)) {
            // 跳过 macOS 打包残留
            if (name.startsWith("__MACOSX/") || name.startsWith(".")) {
                continue;
            }
            if (ExtractSupport.isImage(name)) {
                pages.add(name);
            }
        }
        pages.sort(ExtractSupport::naturalCompare);
        return pages;
    }

    /** 找 ComicInfo.xml；它可能在根目录也可能在子目录，名字大小写也不一定 */
    private Document loadComicInfo(ZipFile zip) throws Exception {
        for (String name : ExtractSupport.listEntries(zip)) {
            if (name.toLowerCase().endsWith(COMIC_INFO)) {
                byte[] data = ExtractSupport.readEntry(zip, name);
                if (data != null) {
                    try {
                        return ExtractSupport.parseXml(data);
                    } catch (Exception ignored) {
                        // ComicInfo.xml 坏了不影响出图，继续走文件名兜底
                    }
                }
            }
        }
        return null;
    }

    /** ComicInfo 的出版日期拆成 Year / Month / Day 三个字段 */
    private String comicDate(Document doc) {
        String year = ExtractSupport.firstText(doc, "Year");
        if (year == null) {
            return null;
        }
        String month = ExtractSupport.firstText(doc, "Month");
        String day = ExtractSupport.firstText(doc, "Day");
        StringBuilder builder = new StringBuilder(year.trim());
        builder.append('-').append(pad2(month));
        builder.append('-').append(pad2(day));
        return ExtractSupport.normalizeDate(builder.toString());
    }

    private String pad2(String value) {
        if (value == null || value.isBlank()) {
            return "01";
        }
        try {
            return String.format("%02d", Integer.parseInt(value.trim()));
        } catch (NumberFormatException ignored) {
            return "01";
        }
    }

    private String fileNameWithoutExt(Path file) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    /** 供阅读器按页出图时复用：取第 index 页（0 基）的 entry 名 */
    public static String pageEntry(ZipFile zip, int index) {
        List<String> pages = listPages(zip);
        if (index < 0 || index >= pages.size()) {
            return null;
        }
        return pages.get(index);
    }
}
