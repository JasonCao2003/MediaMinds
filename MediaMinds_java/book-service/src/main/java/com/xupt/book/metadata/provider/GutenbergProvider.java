package com.xupt.book.metadata.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.book.gutenberg.GutenbergService;
import com.xupt.book.metadata.BookMetadataProvider;
import com.xupt.book.metadata.ProviderBook;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Project Gutenberg（Gutendex）适配器：复用既有 {@link GutenbergService}。 */
@Component
public class GutenbergProvider implements BookMetadataProvider {

    private final GutenbergService gutenbergService;

    public GutenbergProvider(GutenbergService gutenbergService) {
        this.gutenbergService = gutenbergService;
    }

    @Override
    public String id() {
        return "gutenberg";
    }

    @Override
    public String displayName() {
        return "Project Gutenberg";
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<ProviderBook> search(String query, int page) {
        Map<String, Object> raw = gutenbergService.search(query, page, null, null);
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
        return fromDetail(gutenbergService.detail(Long.parseLong(providerId)));
    }

    @Override
    public Map<String, Object> importBook(String providerId) {
        return gutenbergService.importBook(Long.parseLong(providerId));
    }

    private ProviderBook fromNormalized(Map<String, Object> map) {
        ProviderBook book = new ProviderBook();
        book.setProvider(id());
        book.setId(str(map.get("id")));
        book.setTitle(str(map.get("title")));
        book.setAuthor(str(map.get("authors")));
        book.setCover(blankToNull(str(map.get("cover"))));
        book.setLanguage(blankToNull(firstOfList(map.get("languages"))));
        book.setDescription(blankToNull(joinList(map.get("subjects"))));
        if (book.getId() != null) {
            book.setUrl("https://www.gutenberg.org/ebooks/" + book.getId());
        }
        return book;
    }

    private ProviderBook fromDetail(JsonNode detail) {
        ProviderBook book = new ProviderBook();
        book.setProvider(id());
        book.setId(detail.path("id").asLong() > 0 ? String.valueOf(detail.path("id").asLong()) : null);
        book.setTitle(blankToNull(detail.path("title").asText("")));
        book.setAuthor(blankToNull(joinAuthors(detail.path("authors"))));
        book.setCover(blankToNull(coverOf(detail)));
        book.setLanguage(blankToNull(firstOfArray(detail.path("languages"))));
        book.setDescription(blankToNull(joinNodeArray(detail.path("subjects"))));
        if (book.getId() != null) {
            book.setUrl("https://www.gutenberg.org/ebooks/" + book.getId());
        }
        return book;
    }

    private static String coverOf(JsonNode detail) {
        JsonNode formats = detail.path("formats");
        for (String type : new String[]{"image/jpeg", "image/png"}) {
            String url = formats.path(type).asText("");
            if (!url.isEmpty()) {
                return url;
            }
        }
        return "";
    }

    private static String joinAuthors(JsonNode authors) {
        if (authors.isArray()) {
            List<String> list = new ArrayList<>();
            for (JsonNode a : authors) {
                String name = a.path("name").asText("");
                if (!name.isEmpty()) {
                    list.add(name);
                }
            }
            return String.join(" / ", list);
        }
        return "";
    }

    private static String joinNodeArray(JsonNode node) {
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
        return "";
    }

    private static String firstOfArray(JsonNode node) {
        if (node.isArray() && node.size() > 0) {
            return node.get(0).asText("");
        }
        return node.asText("");
    }

    private static String firstOfList(Object value) {
        if (value instanceof List<?> list && !list.isEmpty()) {
            return String.valueOf(list.get(0));
        }
        return value == null ? "" : String.valueOf(value);
    }

    private static String joinList(Object value) {
        if (value instanceof List<?> list) {
            List<String> items = new ArrayList<>();
            for (Object item : list) {
                if (item != null && !String.valueOf(item).isBlank()) {
                    items.add(String.valueOf(item));
                }
            }
            return String.join(" / ", items);
        }
        return value == null ? "" : String.valueOf(value);
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
