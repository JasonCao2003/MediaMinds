package com.xupt.book.metadata.openlibrary;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Mapper.BookTypeMapper;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookType;
import com.xupt.book.file.ExtractSupport;
import com.xupt.book.metadata.BookMetadataProvider;
import com.xupt.book.metadata.ProviderBook;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * OpenLibrary 书源（阶段 3 新增）。
 *
 * <p>与其它源一样只用**公开 API + 元信息**：搜索 / 详情归一化成 {@link ProviderBook}，
 * 导入只写 {@code book} 表，不下载正文。
 */
@Component
public class OpenLibraryProvider implements BookMetadataProvider {

    private static final String SOURCE = "OpenLibrary";
    private static final String DEFAULT_TYPE = "OpenLibrary";
    private static final int SEARCH_LIMIT = 20;

    private final OpenLibraryClient client;
    private final BookMapper bookMapper;
    private final BookTypeMapper bookTypeMapper;

    public OpenLibraryProvider(OpenLibraryClient client, BookMapper bookMapper, BookTypeMapper bookTypeMapper) {
        this.client = client;
        this.bookMapper = bookMapper;
        this.bookTypeMapper = bookTypeMapper;
    }

    @Override
    public String id() {
        return "openlibrary";
    }

    @Override
    public String displayName() {
        return "OpenLibrary";
    }

    @Override
    public List<ProviderBook> search(String query, int page) {
        JsonNode root = client.search(query, page, SEARCH_LIMIT);
        List<ProviderBook> books = new ArrayList<>();
        for (JsonNode doc : root.path("docs")) {
            books.add(fromDoc(doc));
        }
        return books;
    }

    @Override
    public ProviderBook detail(String providerId) {
        JsonNode work = client.work(providerId);
        ProviderBook book = new ProviderBook();
        book.setProvider(id());
        book.setId(workId(work.path("key").asText(providerId)));
        book.setTitle(blankToNull(work.path("title").asText("")));
        book.setDescription(descriptionOf(work));
        book.setCover(coverOf(work.path("covers")));
        book.setPublishedDate(ExtractSupport.normalizeDate(work.path("first_publish_date").asText("")));
        book.setAuthor(blankToNull(joinAuthors(work.path("authors"))));
        if (book.getId() != null) {
            book.setUrl("https://openlibrary.org/works/" + book.getId());
        }
        return book;
    }

    @Override
    public Map<String, Object> importBook(String providerId) {
        Book book = buildBook(providerId);
        if (book == null) {
            throw new IllegalArgumentException("OpenLibrary 书籍标题为空，无法导入");
        }

        Book existing = bookMapper.selectOne(
                new LambdaQueryWrapper<Book>().eq(Book::getBookName, book.getBookName()).last("LIMIT 1"));
        if (existing != null) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("existed", true);
            result.put("book", existing);
            return result;
        }

        book.setCreateTime(LocalDateTime.now());
        book.setUpdateTime(LocalDateTime.now());
        bookMapper.insert(book);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("existed", false);
        result.put("book", book);
        return result;
    }

    @Override
    public Book buildBook(String providerId) {
        ProviderBook meta = detail(providerId);
        if (meta.getTitle() == null || meta.getTitle().isBlank()) {
            return null;
        }

        Book book = new Book();
        book.setBookName(truncate(meta.getTitle(), 100));
        book.setSubtitle(truncate(meta.getSubtitle(), 255));
        book.setBookAuthor(truncate(meta.getAuthor(), 255));
        book.setPublisher(truncate(meta.getPublisher(), 255));
        book.setBookDetails(meta.getDescription());
        book.setBookImg(meta.getCover());
        book.setPageCount(meta.getPageCount());
        book.setLanguage(truncate(meta.getLanguage(), 16));
        book.setIsbn13(meta.getIsbn13());
        book.setIsbn10(meta.getIsbn10());
        LocalDate published = parseDate(meta.getPublishedDate());
        if (published != null) {
            book.setPublishedDate(published);
        }
        book.setTypeId(ensureType(DEFAULT_TYPE));
        book.setChapterCount(0);
        book.setSource(SOURCE);
        return book;
    }

    // ============================================================
    // 归一化
    // ============================================================

    private ProviderBook fromDoc(JsonNode doc) {
        ProviderBook book = new ProviderBook();
        book.setProvider(id());
        book.setId(workId(doc.path("key").asText("")));
        book.setTitle(blankToNull(doc.path("title").asText("")));
        book.setSubtitle(blankToNull(doc.path("subtitle").asText("")));
        book.setAuthor(blankToNull(joinTextArray(doc.path("author_name"))));
        book.setPublisher(blankToNull(firstOf(doc.path("publisher"))));

        int year = doc.path("first_publish_year").asInt(0);
        if (year > 0) {
            book.setPublishedDate(String.format("%04d-01-01", year));
        } else {
            book.setPublishedDate(ExtractSupport.normalizeDate(doc.path("first_publish_date").asText("")));
        }

        book.setCover(coverOf(doc.path("cover_i")));
        book.setLanguage(blankToNull(firstOf(doc.path("language"))));

        int pageCount = doc.path("number_of_pages_median").asInt(0);
        if (pageCount > 0) {
            book.setPageCount(pageCount);
        }
        double rating = doc.path("ratings_average").asDouble(0);
        if (rating > 0) {
            book.setRating(rating);
        }
        int ratingCount = doc.path("ratings_count").asInt(0);
        if (ratingCount > 0) {
            book.setReviewCount(ratingCount);
        }

        pickIsbn(doc.path("isbn"), book);
        if (book.getId() != null) {
            book.setUrl("https://openlibrary.org/works/" + book.getId());
        }
        return book;
    }

    private void pickIsbn(JsonNode isbns, ProviderBook book) {
        if (!isbns.isArray()) {
            return;
        }
        for (JsonNode node : isbns) {
            String value = node.asText("").replaceAll("[^0-9Xx]", "");
            if (value.length() == 13 && book.getIsbn13() == null) {
                book.setIsbn13(value);
            } else if (value.length() == 10 && book.getIsbn10() == null) {
                book.setIsbn10(value);
            }
            if (book.getIsbn13() != null && book.getIsbn10() != null) {
                return;
            }
        }
    }

    /** work 详情的 description 可能是字符串，也可能是 {@code {type, value}} */
    private String descriptionOf(JsonNode work) {
        JsonNode description = work.path("description");
        if (description.isTextual()) {
            return blankToNull(description.asText(""));
        }
        if (description.isObject()) {
            return blankToNull(description.path("value").asText(""));
        }
        return null;
    }

    /** 详情里的 author 只有 key，逐个查作者名（最多 3 个） */
    private String joinAuthors(JsonNode authors) {
        if (!authors.isArray()) {
            return null;
        }
        List<String> names = new ArrayList<>();
        for (JsonNode node : authors) {
            if (names.size() >= 3) {
                break;
            }
            String key = node.path("author").path("key").asText("");
            if (key.isBlank()) {
                continue;
            }
            String name = client.authorName(key);
            if (name != null && !names.contains(name)) {
                names.add(name);
            }
        }
        return names.isEmpty() ? null : String.join(" / ", names);
    }

    private static String coverOf(JsonNode covers) {
        if (covers.isArray() && covers.size() > 0) {
            int id = covers.get(0).asInt(0);
            if (id > 0) {
                return "https://covers.openlibrary.org/b/id/" + id + "-L.jpg";
            }
        }
        return null;
    }

    private static String workId(String key) {
        String clean = OpenLibraryClient.normalizeKey(key);
        if (clean.startsWith("works/")) {
            clean = clean.substring("works/".length());
        }
        return clean.isBlank() ? null : clean;
    }

    private static String joinTextArray(JsonNode node) {
        if (node.isArray()) {
            List<String> list = new ArrayList<>();
            for (JsonNode n : node) {
                String value = n.asText("");
                if (!value.isEmpty()) {
                    list.add(value);
                }
            }
            return String.join(" / ", list);
        }
        return node.asText("");
    }

    private static String firstOf(JsonNode node) {
        if (node.isArray() && node.size() > 0) {
            return node.get(0).asText("");
        }
        return node.asText("");
    }

    private Integer ensureType(String name) {
        BookType type = bookTypeMapper.selectOne(
                new LambdaQueryWrapper<BookType>().eq(BookType::getTypeName, name).last("LIMIT 1"));
        if (type != null) {
            return type.getId();
        }
        BookType created = new BookType();
        created.setTypeName(name);
        created.setCreateTime(LocalDateTime.now());
        created.setUpdateTime(LocalDateTime.now());
        bookTypeMapper.insert(created);
        BookType saved = bookTypeMapper.selectOne(
                new LambdaQueryWrapper<BookType>().eq(BookType::getTypeName, name).last("LIMIT 1"));
        return saved != null ? saved.getId() : created.getId();
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

    private static String truncate(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim();
        return v.length() <= max ? v : v.substring(0, max);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
