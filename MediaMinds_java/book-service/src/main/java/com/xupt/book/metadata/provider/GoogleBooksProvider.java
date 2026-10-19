package com.xupt.book.metadata.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.file.ExtractSupport;
import com.xupt.book.google.GoogleBooksService;
import com.xupt.book.metadata.BookMetadataProvider;
import com.xupt.book.metadata.ProviderBook;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Google Books 适配器：复用既有 {@link GoogleBooksService}，只做字段归一化。 */
@Component
public class GoogleBooksProvider implements BookMetadataProvider {

    private final GoogleBooksService googleBooksService;

    public GoogleBooksProvider(GoogleBooksService googleBooksService) {
        this.googleBooksService = googleBooksService;
    }

    @Override
    public String id() {
        return "google";
    }

    @Override
    public String displayName() {
        return "Google Books";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ProviderBook> search(String query, int page) {
        Map<String, Object> raw = googleBooksService.search(query, page);
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
        return fromVolume(googleBooksService.detail(providerId));
    }

    @Override
    public Map<String, Object> importBook(String providerId) {
        return googleBooksService.importBook(providerId);
    }

    @Override
    public com.xupt.book.Pojo.Book buildBook(String providerId) {
        return googleBooksService.buildBook(providerId);
    }

    /** 搜索结果是 GoogleBooksService 已经归一化过的 Map */
    private ProviderBook fromNormalized(Map<String, Object> map) {
        ProviderBook book = new ProviderBook();
        book.setProvider(id());
        book.setId(str(map.get("id")));
        book.setTitle(str(map.get("title")));
        book.setSubtitle(str(map.get("subtitle")));
        book.setAuthor(str(map.get("author")));
        book.setPublisher(str(map.get("publisher")));
        book.setPublishedDate(ExtractSupport.normalizeDate(str(map.get("pubdate"))));
        book.setDescription(str(map.get("abstract")));
        book.setCover(str(map.get("cover")));
        book.setUrl(str(map.get("url")));
        Object pageCount = map.get("pageCount");
        if (pageCount instanceof Number n && n.intValue() > 0) {
            book.setPageCount(n.intValue());
        }
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

    /** 详情是 Google 原始 volume JSON */
    private ProviderBook fromVolume(JsonNode volume) {
        JsonNode info = volume.path("volumeInfo");
        ProviderBook book = new ProviderBook();
        book.setProvider(id());
        book.setId(blankToNull(volume.path("id").asText("")));
        book.setTitle(blankToNull(info.path("title").asText("")));
        book.setSubtitle(blankToNull(info.path("subtitle").asText("")));
        book.setAuthor(blankToNull(joinArray(info.path("authors"))));
        book.setPublisher(blankToNull(info.path("publisher").asText("")));
        book.setPublishedDate(ExtractSupport.normalizeDate(info.path("publishedDate").asText("")));
        book.setDescription(blankToNull(info.path("description").asText("")));
        book.setLanguage(blankToNull(info.path("language").asText("")));
        book.setCover(blankToNull(coverOf(info)));
        book.setUrl(blankToNull(info.path("infoLink").asText("")));

        int pageCount = info.path("pageCount").asInt(0);
        if (pageCount > 0) {
            book.setPageCount(pageCount);
        }
        double rating = info.path("averageRating").asDouble(0);
        if (rating > 0) {
            book.setRating(rating);
        }
        int ratingCount = info.path("ratingsCount").asInt(0);
        if (ratingCount > 0) {
            book.setReviewCount(ratingCount);
        }

        JsonNode identifiers = info.path("industryIdentifiers");
        if (identifiers.isArray()) {
            for (JsonNode node : identifiers) {
                String value = node.path("identifier").asText("");
                String type = node.path("type").asText("");
                if (value.isEmpty()) {
                    continue;
                }
                if (type.contains("13") || value.length() == 13) {
                    if (book.getIsbn13() == null) {
                        book.setIsbn13(value);
                    }
                } else if (type.contains("10") || value.length() == 10) {
                    if (book.getIsbn10() == null) {
                        book.setIsbn10(value);
                    }
                }
            }
        }
        return book;
    }

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

    private static String joinArray(JsonNode node) {
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

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
