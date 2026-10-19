package com.xupt.book.google;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Mapper.BookTypeMapper;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookType;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Google Books 书源业务编排：搜索归一化、详情，以及把书目导入本地 book 表。
 * 仅入库元信息（书名 / 作者 / 封面 / 简介 / 出版信息），不下载正文。
 */
@Service
public class GoogleBooksService {

    private static final String SOURCE = "Google Books";
    private static final String DEFAULT_TYPE = "Google Books";

    private final GoogleBooksClient client;
    private final GoogleBooksProperties props;
    private final BookMapper bookMapper;
    private final BookTypeMapper bookTypeMapper;

    public GoogleBooksService(GoogleBooksClient client,
                              GoogleBooksProperties props,
                              BookMapper bookMapper,
                              BookTypeMapper bookTypeMapper) {
        this.client = client;
        this.props = props;
        this.bookMapper = bookMapper;
        this.bookTypeMapper = bookTypeMapper;
    }

    // ============================================================
    // 查询
    // ============================================================

    public Map<String, Object> search(String query, int page) {
        int pageSize = props.getPageSize();
        JsonNode root = client.search(query, Math.max(0, (page - 1) * pageSize));
        JsonNode items = root.path("items");

        List<Map<String, Object>> results = new ArrayList<>();
        if (items.isArray()) {
            for (JsonNode item : items) {
                Map<String, Object> normalized = normalize(item);
                if (!str(normalized.get("title")).isEmpty()) {
                    results.add(normalized);
                }
            }
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("count", results.size());
        m.put("page", page);
        m.put("pageSize", pageSize);
        // totalItems 是 Google 给的粗略总数，用于判断还有没有下一页
        m.put("totalItems", root.path("totalItems").asInt(results.size()));
        m.put("results", results);
        return m;
    }

    public JsonNode detail(String volumeId) {
        return client.detail(volumeId);
    }

    /** 把 Google Books 的 volume 归一化成与其它书源一致的字段 */
    private Map<String, Object> normalize(JsonNode item) {
        JsonNode info = item.path("volumeInfo");
        String published = info.path("publishedDate").asText("");

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", item.path("id").asText(""));
        m.put("source", "google");
        m.put("title", info.path("title").asText(""));
        m.put("subtitle", info.path("subtitle").asText(""));
        m.put("author", joinArray(info.path("authors")));
        m.put("publisher", info.path("publisher").asText(""));
        m.put("pubdate", published);
        m.put("year", published.length() >= 4 ? published.substring(0, 4) : published);
        m.put("abstract", info.path("description").asText(""));
        m.put("cover", coverOf(info));
        m.put("rating", info.path("averageRating").asDouble(0));
        m.put("ratingCount", info.path("ratingsCount").asInt(0));
        m.put("pageCount", info.path("pageCount").asInt(0));
        m.put("url", info.path("infoLink").asText(""));
        return m;
    }

    // ============================================================
    // 导入
    // ============================================================

    /**
     * 从 Google Books 详情构建 {@link Book} 实体，**不落库**。
     *
     * <p>抽出来是为了让「只导入元信息」与「导入元信息 + 用户上传的文件」两条路径
     * 共用同一份字段映射，避免填法漂移。
     */
    public Book buildBook(String volumeId) {
        JsonNode detail = client.detail(volumeId);
        JsonNode info = detail.path("volumeInfo");

        String title = info.path("title").asText("");
        if (title.isEmpty()) {
            throw new IllegalArgumentException("Google Books 书籍标题为空，无法导入");
        }

        Book book = new Book();
        book.setBookName(truncate(title, 100));
        book.setSubtitle(blankToNull(truncate(info.path("subtitle").asText(""), 255)));
        // book_author 已从 varchar(20) 扩到 255
        book.setBookAuthor(blankToNull(truncate(joinArray(info.path("authors")), 255)));
        book.setTypeId(ensureType(DEFAULT_TYPE));
        book.setBookImg(blankToNull(coverOf(info)));
        book.setBookDetails(buildDetails(info));
        book.setChapterCount(0);
        book.setSource(SOURCE);

        book.setPublisher(blankToNull(truncate(info.path("publisher").asText(""), 255)));
        book.setPublishedDate(parseDate(info.path("publishedDate").asText("")));
        book.setLanguage(blankToNull(truncate(info.path("language").asText(""), 16)));

        String isbn = isbnOf(info);
        if (isbn.length() == 13) {
            book.setIsbn13(isbn);
        } else if (isbn.length() == 10) {
            book.setIsbn10(isbn);
        }

        int pageCount = info.path("pageCount").asInt(0);
        if (pageCount > 0) {
            book.setPageCount(pageCount);
        }
        double rating = info.path("averageRating").asDouble(0);
        if (rating > 0) {
            book.setRating(BigDecimal.valueOf(rating));
        }
        int ratingCount = info.path("ratingsCount").asInt(0);
        if (ratingCount > 0) {
            book.setReviewCount(ratingCount);
        }
        return book;
    }

    public Map<String, Object> importBook(String volumeId) {
        Book book = buildBook(volumeId);

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

    /** "2021-03-05" / "2021-03" / "2021" → LocalDate；认不出返回 null */
    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        try {
            if (value.length() >= 10) {
                return LocalDate.parse(value.substring(0, 10));
            }
            if (value.length() == 7) {
                return LocalDate.parse(value + "-01");
            }
            if (value.length() == 4) {
                return LocalDate.parse(value + "-01-01");
            }
        } catch (Exception ignored) {
            // 日期格式五花八门，认不出就留空
        }
        return null;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String joinArray(JsonNode node) {
        if (node.isArray()) {
            List<String> list = new ArrayList<>();
            for (JsonNode n : node) {
                String v = n.asText("");
                if (!v.isEmpty()) {
                    list.add(v);
                }
            }
            return String.join(" / ", list);
        }
        return node.asText("");
    }

    /**
     * 封面：Google 返回的是 http 链接且带 {@code &edge=curl}（页面卷边效果）与 {@code &zoom=1}（小图），
     * 这里换成 https、去掉卷边、放大一级。
     */
    private static String coverOf(JsonNode info) {
        JsonNode links = info.path("imageLinks");
        String url = links.path("thumbnail").asText("");
        if (url.isEmpty()) {
            url = links.path("smallThumbnail").asText("");
        }
        if (url.isEmpty()) {
            return "";
        }
        return url.replace("http://", "https://")
                .replace("&edge=curl", "")
                .replace("&zoom=1", "&zoom=2");
    }

    /** 组装简介：出版信息 + ISBN + 页数 + 评分 + 内容简介 */
    private String buildDetails(JsonNode info) {
        StringBuilder sb = new StringBuilder();
        String author = joinArray(info.path("authors"));
        if (!author.isEmpty()) {
            sb.append("作者：").append(author).append('\n');
        }
        String publisher = info.path("publisher").asText("");
        if (!publisher.isEmpty()) {
            sb.append("出版社：").append(publisher).append('\n');
        }
        String published = info.path("publishedDate").asText("");
        if (!published.isEmpty()) {
            sb.append("出版年：").append(published).append('\n');
        }
        int pageCount = info.path("pageCount").asInt(0);
        if (pageCount > 0) {
            sb.append("页数：").append(pageCount).append('\n');
        }
        String isbn = isbnOf(info);
        if (!isbn.isEmpty()) {
            sb.append("ISBN：").append(isbn).append('\n');
        }
        double rating = info.path("averageRating").asDouble(0);
        if (rating > 0) {
            sb.append("Google 评分：").append(rating).append('\n');
        }
        String description = info.path("description").asText("");
        if (!description.isEmpty()) {
            sb.append('\n').append(description);
        }
        sb.append("\n\n来源：Google Books");
        return sb.toString().trim();
    }

    private static String isbnOf(JsonNode info) {
        JsonNode ids = info.path("industryIdentifiers");
        if (ids.isArray()) {
            for (JsonNode id : ids) {
                String value = id.path("identifier").asText("");
                if (!value.isEmpty()) {
                    return value;
                }
            }
        }
        return "";
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

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        String v = value.trim();
        return v.length() <= max ? v : v.substring(0, max);
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }
}
