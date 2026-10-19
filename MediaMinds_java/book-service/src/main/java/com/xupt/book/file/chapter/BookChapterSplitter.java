package com.xupt.book.file.chapter;

import com.xupt.book.Pojo.Book;
import com.xupt.book.file.BookFileReaderService;
import com.xupt.book.file.BookFileService;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 从已上传的 EPUB / PDF 里自动拆分章节（阶段 6 扩展）。
 *
 * <p>**只产出指针**，不复制正文：
 * <ul>
 *   <li>EPUB：{@code epub://{bookId}/{spineIndex}}；
 *       若单个 XHTML 里还有多个章节标题，则带字符区间
 *       {@code epub://{bookId}/{spineIndex}/{start}-{end}}。</li>
 *   <li>PDF：{@code pdf://{bookId}/{startPage}-{endPage}}。</li>
 * </ul>
 * 具体正文由 {@code BookChapterService} 在读取时现取。
 */
@Slf4j
@Service
public class BookChapterSplitter {

    /** 文本里的章节标题行（中文 / 英文常见写法） */
    private static final Pattern TEXT_HEADING = Pattern.compile(
            "(?m)^[ \\t]*(第[0-9一二三四五六七八九十百千零两]+[章回节卷篇][^\\n]{0,40}"
                    + "|(?:CHAPTER|Chapter|BOOK|Book|PART|Part)\\s+[IVXLCDM0-9]+[^\\n]{0,60}"
                    + "|序章[^\\n]{0,30}|前言[^\\n]{0,30}|后记[^\\n]{0,30}|尾声[^\\n]{0,30}|楔子[^\\n]{0,30})\\s*$");

    /** 行级标题（PDF）：同一套章节词 + 常见独立标题 */
    private static final Pattern LINE_HEADING = Pattern.compile(
            "^(第[0-9一二三四五六七八九十百千零两]+[章回节卷篇].{0,40}"
                    + "|(?:CHAPTER|Chapter|BOOK|Book|PART|Part)\\s+[IVXLCDM0-9]+.{0,60}"
                    + "|序章.{0,30}|前言.{0,30}|后记.{0,30}|尾声.{0,30}|楔子.{0,30})$");

    private final BookFileReaderService readerService;
    private final BookFileService bookFileService;
    private final BookChapterProperties properties;

    public BookChapterSplitter(BookFileReaderService readerService,
                               BookFileService bookFileService,
                               BookChapterProperties properties) {
        this.readerService = readerService;
        this.bookFileService = bookFileService;
        this.properties = properties;
    }

    public List<ChapterDraft> split(Book book) throws Exception {
        if (book == null) {
            return List.of();
        }
        String format = book.getFileFormat() == null ? "" : book.getFileFormat().toLowerCase();
        return switch (format) {
            case "epub" -> splitEpub(book);
            case "pdf" -> splitPdf(book);
            default -> List.of();
        };
    }

    // ============================================================
    // EPUB
    // ============================================================

    @SuppressWarnings("unchecked")
    private List<ChapterDraft> splitEpub(Book book) throws Exception {
        Map<String, Object> manifest = readerService.epubManifest(book);
        Object rawChapters = manifest.get("chapters");
        if (!(rawChapters instanceof List<?> chapters)) {
            return List.of();
        }

        List<ChapterDraft> drafts = new ArrayList<>();
        int number = 1;
        for (Object item : chapters) {
            if (!(item instanceof Map<?, ?> chapter)) {
                continue;
            }
            String path = str(chapter.get("path"));
            int spineIndex = intOf(chapter.get("index"));
            if (path == null) {
                continue;
            }
            BookFileReaderService.Resource resource = readerService.epubResource(book, path);
            if (resource == null || resource.data() == null) {
                continue;
            }
            String text = XhtmlTextExtractor.extract(resource.data());
            if (text == null || text.isBlank()) {
                continue;
            }

            List<TextSlice> slices = splitByHeadings(text);
            if (slices.size() >= 2) {
                for (TextSlice slice : slices) {
                    int chapterNumber = number++;
                    drafts.add(new ChapterDraft(
                            chapterNumber,
                            cleanTitle(slice.title(), "第 " + chapterNumber + " 章"),
                            "epub://" + book.getId() + "/" + spineIndex + "/" + slice.start() + "-" + slice.end(),
                            XhtmlTextExtractor.countWords(slice.text())));
                }
            } else {
                int chapterNumber = number++;
                drafts.add(new ChapterDraft(
                        chapterNumber,
                        cleanTitle(str(chapter.get("title")), "第 " + chapterNumber + " 章"),
                        "epub://" + book.getId() + "/" + spineIndex,
                        XhtmlTextExtractor.countWords(text)));
            }
            if (drafts.size() >= properties.getMaxChapters()) {
                break;
            }
        }
        return trim(drafts);
    }

    /** 在单个 XHTML 的文本里按标题行切分；少于 2 个标题返回空（交给 caller 走整章） */
    private List<TextSlice> splitByHeadings(String text) {
        Matcher matcher = TEXT_HEADING.matcher(text);
        List<int[]> starts = new ArrayList<>();
        List<String> titles = new ArrayList<>();
        while (matcher.find()) {
            String title = matcher.group(1).trim();
            if (title.length() > 80) {
                continue;
            }
            starts.add(new int[]{matcher.start(), matcher.end()});
            titles.add(title);
        }
        if (starts.size() < 2) {
            return List.of();
        }

        // 目录页会有大量「第 X 章 ……」短行，按标题切会切出一堆空章节；
        // 标题很多且平均内容很短时，认定这是目录，交给调用方按整章处理。
        int totalLength = 0;
        for (int i = 0; i < starts.size(); i++) {
            int end = i + 1 < starts.size() ? starts.get(i + 1)[0] : text.length();
            totalLength += Math.max(0, end - starts.get(i)[0]);
        }
        if (starts.size() > 50 && totalLength / starts.size() < 200) {
            return List.of();
        }

        List<TextSlice> slices = new ArrayList<>();
        int firstStart = starts.get(0)[0];
        if (firstStart > 200) {
            String preamble = text.substring(0, firstStart).trim();
            if (preamble.length() > 50) {
                slices.add(new TextSlice("前言", 0, firstStart, preamble));
            }
        }
        for (int i = 0; i < starts.size(); i++) {
            int start = starts.get(i)[0];
            int end = i + 1 < starts.size() ? starts.get(i + 1)[0] : text.length();
            String content = text.substring(start, end).trim();
            if (content.length() < 20) {
                continue;
            }
            slices.add(new TextSlice(titles.get(i), start, end, content));
        }
        return slices;
    }

    // ============================================================
    // PDF
    // ============================================================

    private List<ChapterDraft> splitPdf(Book book) throws Exception {
        Path cached = bookFileService.ensureCached(book);
        try (PDDocument document = Loader.loadPDF(cached.toFile())) {
            int pageCount = document.getNumberOfPages();
            if (pageCount <= 0) {
                return List.of();
            }

            LineCollector collector = new LineCollector();
            collector.setSortByPosition(true);
            collector.getText(document);

            int totalChars = collector.lines.stream().mapToInt(line -> line.text.length()).sum();
            if (totalChars < properties.getMinTextLength()) {
                log.info("PDF 没有可用的文本层，跳过章节拆分 bookId={}", book.getId());
                return List.of();
            }

            float bodySize = medianFontSize(collector.lines);
            List<PdfHeading> headings = findHeadings(collector.lines, bodySize);
            if (headings.size() >= 2) {
                return buildPdfChapters(book.getId(), pageCount, headings, collector.lines);
            }
            return fallbackPdfChapters(book.getId(), pageCount, collector.lines);
        }
    }

    private List<ChapterDraft> buildPdfChapters(int bookId, int pageCount,
                                                List<PdfHeading> headings, List<PdfLine> lines) {
        List<ChapterDraft> drafts = new ArrayList<>();
        int number = 1;
        for (int i = 0; i < headings.size() && drafts.size() < properties.getMaxChapters(); i++) {
            PdfHeading heading = headings.get(i);
            int start = Math.max(1, Math.min(heading.page, pageCount));
            int end;
            if (i + 1 < headings.size()) {
                int nextStart = headings.get(i + 1).page;
                end = nextStart > start ? nextStart - 1 : start;
            } else {
                end = pageCount;
            }
            end = Math.min(pageCount, Math.max(start, end));
            int wordCount = XhtmlTextExtractor.countWords(textOfPages(lines, start, end));
            drafts.add(new ChapterDraft(
                    number++,
                    cleanTitle(heading.title, "第 " + start + " 页"),
                    "pdf://" + bookId + "/" + start + "-" + end,
                    wordCount));
        }
        return drafts;
    }

    private List<ChapterDraft> fallbackPdfChapters(int bookId, int pageCount, List<PdfLine> lines) {
        int window = properties.getPdfFallbackPages();
        List<ChapterDraft> drafts = new ArrayList<>();
        if (window <= 0) {
            drafts.add(new ChapterDraft(1, "全文",
                    "pdf://" + bookId + "/1-" + pageCount,
                    XhtmlTextExtractor.countWords(textOfPages(lines, 1, pageCount))));
            return drafts;
        }
        int number = 1;
        for (int start = 1; start <= pageCount && drafts.size() < properties.getMaxChapters(); start += window) {
            int end = Math.min(pageCount, start + window - 1);
            String title = start == end ? "第 " + start + " 页" : "第 " + start + "–" + end + " 页";
            drafts.add(new ChapterDraft(number++, title,
                    "pdf://" + bookId + "/" + start + "-" + end,
                    XhtmlTextExtractor.countWords(textOfPages(lines, start, end))));
        }
        return drafts;
    }

    private List<PdfHeading> findHeadings(List<PdfLine> lines, float bodySize) {
        List<PdfHeading> headings = new ArrayList<>();
        PdfLine previousCandidate = null;
        for (PdfLine line : lines) {
            String text = line.text.trim();
            if (text.isEmpty()) {
                continue;
            }
            boolean matches = LINE_HEADING.matcher(text).matches();
            boolean larger = line.fontSize >= bodySize * 1.15f + 0.1f;
            boolean shortLine = text.length() <= 40;
            boolean noEndPunctuation = !text.matches(".*[。！？.!?；;，,：:]$");
            boolean titleLike = larger && shortLine && noEndPunctuation;

            if (!matches && !titleLike) {
                previousCandidate = null;
                continue;
            }

            // 同一页相邻的两行（如「第一章」+「起点」）合并成一个标题
            if (previousCandidate != null && previousCandidate.page == line.page
                    && line.order - previousCandidate.order <= 1) {
                PdfHeading last = headings.get(headings.size() - 1);
                last.title = last.title + " " + text;
                previousCandidate = line;
                continue;
            }

            headings.add(new PdfHeading(line.page, text));
            previousCandidate = line;
            if (headings.size() >= properties.getMaxChapters()) {
                break;
            }
        }
        // 同一页出现多个标题时只保留第一个，避免互相切出 0 长度章节
        List<PdfHeading> deduped = new ArrayList<>();
        int lastPage = -1;
        for (PdfHeading heading : headings) {
            if (heading.page == lastPage) {
                continue;
            }
            deduped.add(heading);
            lastPage = heading.page;
        }
        return deduped;
    }

    private float medianFontSize(List<PdfLine> lines) {
        if (lines.isEmpty()) {
            return 12f;
        }
        List<Float> sizes = new ArrayList<>();
        for (PdfLine line : lines) {
            if (line.fontSize > 0) {
                sizes.add(line.fontSize);
            }
        }
        if (sizes.isEmpty()) {
            return 12f;
        }
        Collections.sort(sizes);
        return sizes.get(sizes.size() / 2);
    }

    private String textOfPages(List<PdfLine> lines, int start, int end) {
        StringBuilder sb = new StringBuilder();
        for (PdfLine line : lines) {
            if (line.page >= start && line.page <= end) {
                sb.append(line.text).append('\n');
            }
        }
        return sb.toString();
    }

    /** PDF 行：页码 + 文本 + 字号 + 行内序号 */
    private static final class PdfLine {
        private final int page;
        private final int order;
        private final String text;
        private final float fontSize;

        private PdfLine(int page, int order, String text, float fontSize) {
            this.page = page;
            this.order = order;
            this.text = text;
            this.fontSize = fontSize;
        }
    }

    private static final class PdfHeading {
        private final int page;
        private String title;

        private PdfHeading(int page, String title) {
            this.page = page;
            this.title = title;
        }
    }

    /** 按行收集文本与字号 */
    private static final class LineCollector extends PDFTextStripper {
        private final List<PdfLine> lines = new ArrayList<>();
        private int order = 0;

        private LineCollector() throws IOException {
            super();
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) throws IOException {
            super.writeString(text, positions);
            if (text == null || text.isBlank()) {
                return;
            }
            float size = 0;
            if (positions != null && !positions.isEmpty()) {
                float sum = 0;
                int count = 0;
                for (TextPosition position : positions) {
                    if (position.getFontSizeInPt() > 0) {
                        sum += position.getFontSizeInPt();
                        count++;
                    }
                }
                size = count > 0 ? sum / count : 0;
            }
            lines.add(new PdfLine(getCurrentPageNo(), order++, text.trim(), size));
        }
    }

    // ============================================================

    private List<ChapterDraft> trim(List<ChapterDraft> drafts) {
        if (drafts.size() <= properties.getMaxChapters()) {
            return drafts;
        }
        return new ArrayList<>(drafts.subList(0, properties.getMaxChapters()));
    }

    private static String cleanTitle(String title, String fallback) {
        if (title == null || title.isBlank()) {
            return fallback;
        }
        String cleaned = title.replaceAll("\\s+", " ").trim();
        if (cleaned.length() > 200) {
            cleaned = cleaned.substring(0, 200);
        }
        return cleaned.isBlank() ? fallback : cleaned;
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static int intOf(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return 0;
        }
    }

    /** 一个拆分出来的章节草稿（number 从 1 开始） */
    public record ChapterDraft(int number, String title, String contentPath, int wordCount) {
    }

    private record TextSlice(String title, int start, int end, String text) {
    }
}
