package com.xupt.book.douban;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Mapper.BookTypeMapper;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookType;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 豆瓣书源业务编排：搜索归一化、详情，以及把豆瓣书目导入本地 book 表。
 * 仅入库元信息（书名 / 作者 / 封面 / 简介 / 出版信息），不下载正文。
 */
@Service
public class DoubanService {

    private static final String SOURCE = "豆瓣";
    private static final String DEFAULT_TYPE = "豆瓣书源";

    private final DoubanClient client;
    private final BookMapper bookMapper;
    private final BookTypeMapper bookTypeMapper;

    public DoubanService(DoubanClient client, BookMapper bookMapper, BookTypeMapper bookTypeMapper) {
        this.client = client;
        this.bookMapper = bookMapper;
        this.bookTypeMapper = bookTypeMapper;
    }

    // ============================================================
    // 查询
    // ============================================================

    public Map<String, Object> search(String query, int page) {
        List<Map<String, Object>> raw = client.search(query);
        List<Map<String, Object>> results = new ArrayList<>();
        for (Map<String, Object> item : raw) {
            results.add(normalize(item));
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("count", results.size());
        m.put("page", 1);
        m.put("results", results);
        return m;
    }

    public JsonNode detail(long doubanId) {
        return client.detail(doubanId);
    }

    /** 把豆瓣搜索结果归一化：author / publisher / pubdate 从 abstract 拆分 */
    private Map<String, Object> normalize(Map<String, Object> item) {
        String abstractText = str(item.get("abstract"));
        String[] parts = abstractText.split("\\s*/\\s*");
        String author = parts.length > 0 ? parts[0].trim() : "";
        String publisher = parts.length > 1 ? parts[1].trim() : "";
        String pubdate = parts.length > 2 ? parts[2].trim() : "";

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", item.get("id"));
        m.put("source", "douban");
        m.put("title", str(item.get("title")));
        m.put("author", author);
        m.put("publisher", publisher);
        m.put("pubdate", pubdate);
        m.put("year", pubdate.length() >= 4 ? pubdate.substring(0, 4) : pubdate);
        m.put("abstract", abstractText);
        m.put("cover", str(item.get("cover")));
        m.put("rating", item.get("rating"));
        m.put("ratingCount", item.get("ratingCount"));
        m.put("url", str(item.get("url")));
        return m;
    }

    // ============================================================
    // 导入
    // ============================================================

    public Map<String, Object> importBook(long doubanId) {
        JsonNode detail = client.detail(doubanId);
        String title = detail.path("title").asText("");
        if (title.isEmpty()) {
            throw new IllegalArgumentException("豆瓣书籍标题为空，无法导入");
        }
        String bookName = truncate(title, 100);

        Book existing = bookMapper.selectOne(
                new LambdaQueryWrapper<Book>().eq(Book::getBookName, bookName).last("LIMIT 1"));
        if (existing != null) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("existed", true);
            result.put("book", existing);
            return result;
        }

        Book book = new Book();
        book.setBookName(bookName);
        book.setBookAuthor(truncate(joinAuthors(detail), 20));
        book.setTypeId(ensureType(DEFAULT_TYPE));
        book.setBookImg(pickCover(detail));
        book.setBookDetails(buildDetails(detail));
        book.setChapterCount(0);
        book.setSource(SOURCE);
        book.setCreateTime(LocalDateTime.now());
        book.setUpdateTime(LocalDateTime.now());
        bookMapper.insert(book);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("existed", false);
        result.put("book", book);
        return result;
    }

    private String joinAuthors(JsonNode detail) {
        JsonNode authors = detail.path("author");
        if (authors.isArray()) {
            List<String> list = new ArrayList<>();
            for (JsonNode a : authors) {
                String name = a.asText("");
                if (!name.isEmpty()) {
                    list.add(name);
                }
            }
            return String.join(" / ", list);
        }
        return "";
    }

    private String pickCover(JsonNode detail) {
        String pic = detail.path("pic").asText("");
        if (!pic.isEmpty()) {
            return pic;
        }
        return detail.path("cover_url").asText("");
    }

    /** 组装简介：出版信息 + 内容简介 + 评分 */
    private String buildDetails(JsonNode detail) {
        StringBuilder sb = new StringBuilder();
        String author = joinAuthors(detail);
        if (!author.isEmpty()) {
            sb.append("作者：").append(author).append('\n');
        }
        String press = firstOf(detail.path("press"));
        if (!press.isEmpty()) {
            sb.append("出版社：").append(press).append('\n');
        }
        String pubdate = firstOf(detail.path("pubdate"));
        if (!pubdate.isEmpty()) {
            sb.append("出版年：").append(pubdate).append('\n');
        }
        String price = firstOf(detail.path("price"));
        if (!price.isEmpty()) {
            sb.append("定价：").append(price).append('\n');
        }
        double rating = detail.path("rating").path("value").asDouble(0);
        if (rating > 0) {
            sb.append("豆瓣评分：").append(rating).append('\n');
        }
        String intro = detail.path("intro").asText("");
        if (!intro.isEmpty()) {
            sb.append('\n').append(intro);
        }
        sb.append("\n\n来源：豆瓣");
        return sb.toString().trim();
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
