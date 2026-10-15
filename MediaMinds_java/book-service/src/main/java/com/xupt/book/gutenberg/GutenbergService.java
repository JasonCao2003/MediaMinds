package com.xupt.book.gutenberg;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.Mapper.BookChapterMapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Mapper.BookTypeMapper;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookChapter;
import com.xupt.book.Pojo.BookType;
import com.xupt.book.Utils.MinioUtil;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Project Gutenberg 业务编排：搜索归一化、详情，以及把公有领域电子书导入本地书库
 * （下载封面与正文，按章节切分后存入 MinIO 并写入 book / book_chapter）。
 */
@Service
public class GutenbergService {

    /** 常见章节标题：CHAPTER/BOOK/PART + 数字或罗马数字，或“第X章/回/节/卷” */
    private static final Pattern CHAPTER_PATTERN = Pattern.compile(
            "(?m)^\\s*(?:CHAPTER|Chapter|BOOK|Book|PART|Part)\\s+[IVXLCDM0-9]+[^\\n]*$"
                    + "|^\\s*第[一二三四五六七八九十百零两\\d]+[章回节卷][^\\n]*$");

    private static final Pattern GUTENBERG_START = Pattern.compile(
            "(?s)\\A.*?\\*\\*\\*\\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\\*\\*\\*");
    private static final Pattern GUTENBERG_END = Pattern.compile(
            "(?s)\\*\\*\\*\\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*\\z");

    private final GutenbergClient client;
    private final GutenbergProperties props;
    private final BookMapper bookMapper;
    private final BookChapterMapper bookChapterMapper;
    private final BookTypeMapper bookTypeMapper;

    public GutenbergService(GutenbergClient client, GutenbergProperties props,
                            BookMapper bookMapper, BookChapterMapper bookChapterMapper,
                            BookTypeMapper bookTypeMapper) {
        this.client = client;
        this.props = props;
        this.bookMapper = bookMapper;
        this.bookChapterMapper = bookChapterMapper;
        this.bookTypeMapper = bookTypeMapper;
    }

    // ============================================================
    // 查询
    // ============================================================

    public Map<String, Object> search(String query, int page, String languages, String topic) {
        String effectiveLanguages = (languages == null || languages.isBlank()) ? props.getLanguages() : languages.trim();
        JsonNode raw = client.search(query, page, effectiveLanguages, topic);
        List<Map<String, Object>> results = new ArrayList<>();
        for (JsonNode item : raw.path("results")) {
            results.add(normalize(item));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("count", raw.path("count").asInt(results.size()));
        result.put("next", raw.path("next").asText(null));
        result.put("previous", raw.path("previous").asText(null));
        result.put("results", results);
        return result;
    }

    public JsonNode detail(long gutenbergId) {
        return client.getById(gutenbergId);
    }

    private Map<String, Object> normalize(JsonNode item) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", item.path("id").asLong());
        m.put("title", item.path("title").asText(""));
        m.put("authors", joinAuthors(item));
        m.put("languages", toStringList(item.path("languages")));
        m.put("subjects", toStringList(item.path("subjects")));
        m.put("downloadCount", item.path("download_count").asInt(0));
        m.put("cover", pickFormat(item, "image/jpeg"));
        m.put("textUrl", pickTextFormat(item));
        return m;
    }

    // ============================================================
    // 导入
    // ============================================================

    public Map<String, Object> importBook(long gutenbergId) {
        JsonNode detail = client.getById(gutenbergId);
        String rawTitle = detail.path("title").asText("");
        if (rawTitle.isEmpty()) {
            throw new IllegalArgumentException("Gutenberg 书籍标题为空，无法导入");
        }
        String title = truncate(rawTitle, 100);
        String fullAuthors = joinAuthors(detail);

        Book existing = bookMapper.selectOne(
                new LambdaQueryWrapper<Book>().eq(Book::getBookName, title).last("LIMIT 1"));
        if (existing != null) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("existed", true);
            result.put("book", existing);
            return result;
        }

        Book book = new Book();
        book.setBookName(title);
        // book_author 列为 varchar(20)，这里存首位作者并截断，完整作者写入详情
        book.setBookAuthor(truncate(fullAuthors, 20));
        book.setTypeId(ensureType(props.getDefaultTypeName()));
        book.setBookDetails(buildDetails(detail, fullAuthors));
        book.setBookImg(storeCover(detail));
        book.setChapterCount(0);
        book.setSource("Project Gutenberg");
        book.setCreateTime(LocalDateTime.now());
        book.setUpdateTime(LocalDateTime.now());
        bookMapper.insert(book);

        int chapterCount = 0;
        if (props.isImportDownloadText()) {
            String textUrl = pickTextFormat(detail);
            if (!textUrl.isEmpty()) {
                try {
                    String text = cleanGutenbergText(client.downloadText(textUrl));
                    chapterCount = storeChapters(book, text);
                } catch (Exception ignored) {
                    // 正文下载/切分失败时仍保留书籍元数据
                }
            }
        }

        if (chapterCount > 0) {
            book.setChapterCount(chapterCount);
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.updateById(book);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("existed", false);
        result.put("book", book);
        result.put("chapterCount", chapterCount);
        return result;
    }

    private int storeChapters(Book book, String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        List<String[]> chapters = splitChapters(text);
        int number = 1;
        for (String[] chapter : chapters) {
            String chapterTitle = chapter[0];
            String content = chapter[1];
            String objectName = "book/" + safe(book.getBookName()) + "/"
                    + String.format("%03d", number) + "_" + safe(chapterTitle) + ".txt";
            String contentPath;
            try {
                contentPath = MinioUtil.UploadFile(objectName,
                        new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));
            } catch (Exception e) {
                number++;
                continue;
            }
            BookChapter row = new BookChapter();
            row.setBookId(book.getId());
            row.setChapterNumber(number);
            row.setChapterTitle(chapterTitle);
            row.setContentPath(contentPath);
            row.setWordCount(wordCount(content));
            row.setCreateTime(LocalDateTime.now());
            row.setUpdateTime(LocalDateTime.now());
            bookChapterMapper.insert(row);
            number++;
        }
        return number - 1;
    }

    /** 按章节标题切分正文；无标题则整体作为一章“全文”。 */
    private List<String[]> splitChapters(String text) {
        List<String[]> chapters = new ArrayList<>();
        Matcher matcher = CHAPTER_PATTERN.matcher(text);
        List<Integer> starts = new ArrayList<>();
        List<String> titles = new ArrayList<>();
        while (matcher.find()) {
            starts.add(matcher.start());
            titles.add(matcher.group().trim());
        }
        if (starts.isEmpty()) {
            chapters.add(new String[]{"全文", text.trim()});
            return chapters;
        }
        if (starts.get(0) > 0) {
            String preamble = text.substring(0, starts.get(0)).trim();
            if (preamble.length() > 80) {
                chapters.add(new String[]{"前言", preamble});
            }
        }
        for (int i = 0; i < starts.size(); i++) {
            int start = starts.get(i);
            int end = (i + 1 < starts.size()) ? starts.get(i + 1) : text.length();
            String content = text.substring(start, end).trim();
            if (!content.isEmpty()) {
                chapters.add(new String[]{titles.get(i), content});
            }
        }
        return chapters;
    }

    private String cleanGutenbergText(String text) {
        if (text == null) {
            return "";
        }
        text = GUTENBERG_START.matcher(text).replaceFirst("");
        text = GUTENBERG_END.matcher(text).replaceFirst("");
        return text.trim();
    }

    private String storeCover(JsonNode detail) {
        String coverUrl = pickFormat(detail, "image/jpeg");
        if (coverUrl.isEmpty()) {
            return "";
        }
        if (!props.isImportDownloadCover()) {
            return coverUrl;
        }
        try {
            byte[] bytes = client.downloadBytes(coverUrl);
            return MinioUtil.UploadFile("book/cover/" + UUID.randomUUID() + ".jpg",
                    new ByteArrayInputStream(bytes));
        } catch (Exception e) {
            return coverUrl;
        }
    }

    private Integer ensureType(String typeName) {
        BookType existing = bookTypeMapper.selectOne(
                new LambdaQueryWrapper<BookType>().eq(BookType::getTypeName, typeName).last("LIMIT 1"));
        if (existing != null) {
            return existing.getId();
        }
        BookType type = new BookType();
        type.setTypeName(typeName);
        type.setCreateTime(LocalDateTime.now());
        type.setUpdateTime(LocalDateTime.now());
        bookTypeMapper.insert(type);
        BookType saved = bookTypeMapper.selectOne(
                new LambdaQueryWrapper<BookType>().eq(BookType::getTypeName, typeName).last("LIMIT 1"));
        return saved != null ? saved.getId() : type.getId();
    }

    private String buildDetails(JsonNode detail, String authors) {
        List<String> parts = new ArrayList<>();
        if (authors != null && !authors.isBlank()) {
            parts.add("作者：" + authors);
        }
        List<String> subjects = toStringList(detail.path("subjects"));
        if (!subjects.isEmpty()) {
            parts.add("主题：" + String.join("；", subjects.subList(0, Math.min(subjects.size(), 10))));
        }
        List<String> shelves = toStringList(detail.path("bookshelves"));
        if (!shelves.isEmpty()) {
            parts.add("书架：" + String.join("；", shelves.subList(0, Math.min(shelves.size(), 5))));
        }
        parts.add("来源：Project Gutenberg（公有领域）");
        return String.join("\n", parts);
    }

    private String joinAuthors(JsonNode node) {
        List<String> names = new ArrayList<>();
        for (JsonNode author : node.path("authors")) {
            String name = author.path("name").asText("");
            if (!name.isEmpty()) {
                names.add(name);
            }
        }
        return names.isEmpty() ? "Unknown" : String.join(" / ", names);
    }

    private String pickTextFormat(JsonNode node) {
        String[] preferred = {
                "text/plain; charset=utf-8",
                "text/plain; charset=us-ascii",
                "text/plain",
                "text/html; charset=utf-8",
                "text/html"
        };
        for (String key : preferred) {
            String url = node.path("formats").path(key).asText("");
            if (!url.isEmpty()) {
                return url;
            }
        }
        return "";
    }

    private String pickFormat(JsonNode node, String key) {
        return node.path("formats").path(key).asText("");
    }

    private List<String> toStringList(JsonNode array) {
        List<String> list = new ArrayList<>();
        if (array.isArray()) {
            for (JsonNode item : array) {
                list.add(item.asText(""));
            }
        }
        return list;
    }

    private int wordCount(String content) {
        if (content == null || content.isBlank()) {
            return 0;
        }
        return content.trim().split("\\s+").length;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String safe(String value) {
        if (value == null) {
            return "untitled";
        }
        String cleaned = value.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_").trim();
        if (cleaned.length() > 60) {
            cleaned = cleaned.substring(0, 60);
        }
        return cleaned.isEmpty() ? "untitled" : cleaned;
    }
}
