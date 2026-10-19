package com.xupt.book.metadata.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.douban.DoubanService;
import com.xupt.book.file.ExtractSupport;
import com.xupt.book.metadata.BookMetadataProvider;
import com.xupt.book.metadata.ProviderBook;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** 豆瓣适配器：复用既有 {@link DoubanService}。 */
@Component
public class DoubanProvider implements BookMetadataProvider {

    private final DoubanService doubanService;

    public DoubanProvider(DoubanService doubanService) {
        this.doubanService = doubanService;
    }

    @Override
    public String id() {
        return "douban";
    }

    @Override
    public String displayName() {
        return "豆瓣";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ProviderBook> search(String query, int page) {
        Map<String, Object> raw = doubanService.search(query, page);
        List<ProviderBook> books = new ArrayList<>();
        Object results = raw.get("results");
        if (results instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    books.add(fromNormalized((Map<String, Object>) map));
                }
            }
        }
        return books;
    }

    @Override
    public ProviderBook detail(String providerId) {
        return fromDetail(doubanService.detail(Long.parseLong(providerId)));
    }

    @Override
    public Map<String, Object> importBook(String providerId) {
        return doubanService.importBook(Long.parseLong(providerId));
    }

    @Override
    public com.xupt.book.Pojo.Book buildBook(String providerId) {
        return doubanService.buildBook(Long.parseLong(providerId));
    }

    private ProviderBook fromNormalized(Map<String, Object> map) {
        ProviderBook book = new ProviderBook();
        book.setProvider(id());
        book.setId(str(map.get("id")));
        book.setTitle(str(map.get("title")));
        book.setAuthor(str(map.get("author")));
        book.setPublisher(str(map.get("publisher")));
        book.setPublishedDate(ExtractSupport.normalizeDate(str(map.get("pubdate"))));
        book.setDescription(blankToNull(str(map.get("abstract"))));
        book.setCover(str(map.get("cover")));
        book.setUrl(str(map.get("url")));
        Object rating = map.get("rating");
        if (rating instanceof Number n && n.doubleValue() > 0) {
            book.setRating(n.doubleValue());
        }
        Object ratingCount = map.get("ratingCount");
        if (ratingCount instanceof Number n && n.intValue() > 0) {
            book.setReviewCount(n.intValue());
        }
        return book;
    }

    /** 豆瓣 rexxar 详情原始 JSON */
    private ProviderBook fromDetail(JsonNode detail) {
        ProviderBook book = new ProviderBook();
        book.setProvider(id());
        book.setId(detail.path("id").asText(""));
        book.setTitle(blankToNull(detail.path("title").asText("")));
        book.setAuthor(blankToNull(joinAuthors(detail.path("author"))));
        book.setPublisher(blankToNull(firstOf(detail.path("press"))));
        book.setPublishedDate(ExtractSupport.normalizeDate(firstOf(detail.path("pubdate"))));
        book.setDescription(blankToNull(detail.path("intro").asText("")));
        book.setLanguage(blankToNull(firstOf(detail.path("language"))));
        book.setCover(blankToNull(firstNonBlank(detail.path("pic").asText(""), detail.path("cover_url").asText(""))));

        String isbn = firstOf(detail.path("isbn")).replaceAll("[^0-9Xx]", "");
        if (isbn.length() == 13) {
            book.setIsbn13(isbn);
        } else if (isbn.length() == 10) {
            book.setIsbn10(isbn);
        }

        double rating = detail.path("rating").path("value").asDouble(0);
        if (rating > 0) {
            book.setRating(rating);
        }
        int ratingCount = detail.path("rating").path("count").asInt(0);
        if (ratingCount > 0) {
            book.setReviewCount(ratingCount);
        }
        return book;
    }

    private static String joinAuthors(JsonNode authors) {
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
        return authors.asText("");
    }

    private static String firstOf(JsonNode node) {
        if (node.isArray() && node.size() > 0) {
            return node.get(0).asText("");
        }
        return node.asText("");
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
