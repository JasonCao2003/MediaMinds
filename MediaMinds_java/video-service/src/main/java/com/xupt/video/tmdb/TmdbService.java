package com.xupt.video.tmdb;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.xupt.video.Mapper.CategoryMapper;
import com.xupt.video.Mapper.MovieCategoryMapper;
import com.xupt.video.Mapper.MovieMapper;
import com.xupt.video.Mapper.MovieTagMapper;
import com.xupt.video.Mapper.TagMapper;
import com.xupt.video.Pojo.Category;
import com.xupt.video.Pojo.Movie;
import com.xupt.video.Pojo.MovieCategory;
import com.xupt.video.Pojo.MovieTag;
import com.xupt.video.Pojo.Tag;
import com.xupt.video.Utils.MinioUtil;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * TMDB 业务编排：搜索/详情归一化，以及把 TMDB 影片导入本地 movie 表
 * （自动创建分类与标签并建立关联）。
 */
@Service
public class TmdbService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final TmdbClient client;
    private final TmdbProperties props;
    private final MovieMapper movieMapper;
    private final CategoryMapper categoryMapper;
    private final TagMapper tagMapper;
    private final MovieCategoryMapper movieCategoryMapper;
    private final MovieTagMapper movieTagMapper;

    public TmdbService(TmdbClient client, TmdbProperties props,
                       MovieMapper movieMapper, CategoryMapper categoryMapper, TagMapper tagMapper,
                       MovieCategoryMapper movieCategoryMapper, MovieTagMapper movieTagMapper) {
        this.client = client;
        this.props = props;
        this.movieMapper = movieMapper;
        this.categoryMapper = categoryMapper;
        this.tagMapper = tagMapper;
        this.movieCategoryMapper = movieCategoryMapper;
        this.movieTagMapper = movieTagMapper;
    }

    // ============================================================
    // 查询
    // ============================================================

    public Map<String, Object> search(String query, int page) {
        JsonNode raw = client.searchMovie(query, page);
        return withMeta(raw);
    }

    public Map<String, Object> popular(int page) {
        return withMeta(client.popular(page));
    }

    public Map<String, Object> topRated(int page) {
        return withMeta(client.topRated(page));
    }

    /** 按类型/年份等条件筛选（discover） */
    public Map<String, Object> discover(int page, String withGenres, String year, String sortBy, String region) {
        return withMeta(client.discover(page, withGenres, year, sortBy, region));
    }

    public JsonNode genres() {
        return client.genres();
    }

    /** 人物搜索（演员/导演），返回归一化结果 */
    public Map<String, Object> searchPerson(String query, int page) {
        return withMeta(client.searchPerson(query, page));
    }

    /** 按人物（演员/导演）筛选影片 */
    public Map<String, Object> discoverByPerson(int page, long personId, String role) {
        return withMeta(client.discoverByPerson(page, personId, role));
    }

    public JsonNode detail(long tmdbId) {
        return client.movieDetail(tmdbId, "credits,keywords,images");
    }

    /** 附带图片基础信息，便于前端拼封面地址 */
    private Map<String, Object> withMeta(JsonNode raw) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("imageBase", TmdbProperties.IMAGE_BASE);
        m.put("posterSize", props.getPosterSize());
        m.put("page", raw.path("page").asInt(1));
        m.put("totalPages", raw.path("total_pages").asInt(1));
        m.put("totalResults", raw.path("total_results").asInt(0));
        m.put("results", raw.path("results"));
        return m;
    }

    // ============================================================
    // 导入
    // ============================================================

    public Map<String, Object> importMovie(long tmdbId) {
        JsonNode detail = detail(tmdbId);
        String title = text(detail, "title", "original_title");
        if (title.isEmpty()) {
            throw new IllegalArgumentException("TMDB 影片标题为空，无法导入");
        }

        Movie existing = movieMapper.selectOne(
                new LambdaQueryWrapper<Movie>().eq(Movie::getName, title).last("LIMIT 1"));
        if (existing != null) {
            // 老数据可能没有 tmdb_id：重新导入时顺手补齐，供第三方播放源查询
            if (existing.getTmdbId() == null) {
                existing.setTmdbId(tmdbId);
                existing.setUpdateTime(LocalDateTime.now());
                movieMapper.updateById(existing);
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("existed", true);
            result.put("movie", existing);
            return result;
        }

        Movie movie = new Movie();
        movie.setName(title);
        movie.setAbs(text(detail, "tagline"));
        movie.setInfo(text(detail, "overview"));
        movie.setDirectedBy(resolveDirector(detail));
        movie.setActor(resolveActors(detail, 8));
        movie.setType(resolveGenres(detail));
        movie.setRate(BigDecimal.valueOf(detail.path("vote_average").asDouble(0.0)));
        movie.setRateCount(detail.path("vote_count").asInt(0));
        movie.setTime(detail.path("runtime").asInt(0));
        String releaseDate = text(detail, "release_date");
        if (!releaseDate.isEmpty()) {
            try {
                movie.setShowTime(LocalDate.parse(releaseDate, DATE_FMT).atStartOfDay());
            } catch (Exception ignored) {
                // 日期解析失败则忽略
            }
        }
        movie.setPicture(storePoster(text(detail, "poster_path")));
        movie.setLanguage(resolveLanguage(detail));
        movie.setArea(resolveArea(detail));
        movie.setVideo("");
        movie.setSource("TMDB");
        movie.setTmdbId(tmdbId);
        LocalDateTime now = LocalDateTime.now();
        movie.setCreateTime(now);
        movie.setUpdateTime(now);
        movieMapper.insert(movie);

        List<String> categoryNames = new ArrayList<>();
        for (JsonNode genre : detail.path("genres")) {
            String genreName = genre.path("name").asText("");
            if (!genreName.isEmpty()) {
                Long categoryId = ensureCategory(genreName);
                linkCategory(movie.getId(), categoryId);
                categoryNames.add(genreName);
            }
        }

        List<String> tagNames = new ArrayList<>();
        JsonNode keywords = detail.path("keywords").path("keywords");
        if (keywords.isArray()) {
            for (JsonNode kw : keywords) {
                String kwName = kw.path("name").asText("");
                if (!kwName.isEmpty()) {
                    Long tagId = ensureTag(kwName);
                    linkTag(movie.getId(), tagId);
                    tagNames.add(kwName);
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("existed", false);
        result.put("movie", movie);
        result.put("categories", categoryNames);
        result.put("tags", tagNames);
        return result;
    }

    /** TMDB original_language → 本地语言码（0 中文 / 1 英语 / 2 粤语 / 3 其他） */
    private Integer resolveLanguage(JsonNode detail) {
        String lang = text(detail, "original_language");
        return switch (lang) {
            case "zh" -> 0;
            case "en" -> 1;
            case "yue" -> 2;
            default -> 3;
        };
    }

    /** TMDB 出品国 → 本地地区码（0 中国大陆 / 1 中国香港 / 3 美国 / 2 其他） */
    private Integer resolveArea(JsonNode detail) {
        String country = "";
        JsonNode countries = detail.path("production_countries");
        if (countries.isArray() && countries.size() > 0) {
            country = countries.get(0).path("iso_3166_1").asText("");
        }
        if (country.isEmpty()) {
            JsonNode origin = detail.path("origin_country");
            if (origin.isArray() && origin.size() > 0) {
                country = origin.get(0).asText("");
            }
        }
        return switch (country) {
            case "CN" -> 0;
            case "HK" -> 1;
            case "US" -> 3;
            default -> 2;
        };
    }

    // ============================================================
    // 第三方播放平台
    // ============================================================

    /**
     * 查询本地影片在 TMDB 上登记的第三方观看平台。
     *
     * <p>新导入的 TMDB 影片直接有 tmdb_id；老数据没有时按标题回查一次并回填，
     * 这样不用手工维护「本地影片 → TMDB ID」的映射。
     */
    public Map<String, Object> watchProviders(Long movieId) {
        Movie movie = movieMapper.selectById(movieId);
        if (movie == null) {
            throw new IllegalArgumentException("影片不存在");
        }

        Long tmdbId = movie.getTmdbId();
        if (tmdbId == null) {
            tmdbId = resolveTmdbId(movie);
            if (tmdbId != null) {
                movie.setTmdbId(tmdbId);
                movie.setUpdateTime(LocalDateTime.now());
                movieMapper.updateById(movie);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("movieId", movieId);
        result.put("tmdbId", tmdbId);
        result.put("region", props.getWatchRegion());

        if (tmdbId == null) {
            result.put("link", tmdbSearchUrl(movie.getName()));
            result.put("providers", List.of());
            result.put("groups", List.of());
            result.put("note", "未找到该影片的 TMDB 记录，无法获取第三方播放平台");
            return result;
        }

        JsonNode raw;
        try {
            raw = client.watchProviders(tmdbId);
        } catch (Exception e) {
            result.put("link", "https://www.themoviedb.org/movie/" + tmdbId);
            result.put("providers", List.of());
            result.put("groups", List.of());
            result.put("note", "TMDB 播放平台查询失败：" + e.getMessage());
            return result;
        }
        JsonNode results = raw.path("results");
        String region = chooseRegion(results, props.getWatchRegion());
        JsonNode regionNode = results.path(region);
        String link = text(regionNode, "link");
        if (link.isEmpty()) {
            link = "https://www.themoviedb.org/movie/" + tmdbId + "/watch?locale=" + region;
        }

        List<String> availableRegions = new ArrayList<>();
        Iterator<String> names = results.fieldNames();
        while (names.hasNext()) {
            availableRegions.add(names.next());
        }

        List<Map<String, Object>> groups = new ArrayList<>();
        List<Map<String, Object>> providers = new ArrayList<>();
        String[][] types = {
                {"flatrate", "订阅"},
                {"free", "免费"},
                {"ads", "含广告"},
                {"rent", "租借"},
                {"buy", "购买"}
        };
        for (String[] type : types) {
            JsonNode list = regionNode.path(type[0]);
            if (!list.isArray() || list.isEmpty()) {
                continue;
            }
            List<Map<String, Object>> groupProviders = new ArrayList<>();
            for (JsonNode provider : list) {
                String name = provider.path("provider_name").asText("");
                if (name.isEmpty()) {
                    continue;
                }
                String logoPath = provider.path("logo_path").asText("");
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", provider.path("provider_id").asLong());
                item.put("name", name);
                item.put("logo", logoPath.isEmpty() ? "" : TmdbProperties.IMAGE_BASE + "w92" + logoPath);
                item.put("type", type[0]);
                item.put("typeLabel", type[1]);
                groupProviders.add(item);
                providers.add(item);
            }
            if (!groupProviders.isEmpty()) {
                Map<String, Object> group = new LinkedHashMap<>();
                group.put("type", type[0]);
                group.put("label", type[1]);
                group.put("providers", groupProviders);
                groups.add(group);
            }
        }

        result.put("region", region);
        result.put("availableRegions", availableRegions);
        result.put("link", link);
        result.put("providers", providers);
        result.put("groups", groups);
        if (providers.isEmpty()) {
            result.put("note", "TMDB 暂未收录该地区（" + region + "）的播放平台");
        }
        return result;
    }

    /** 老数据没有 tmdb_id：按标题搜索一次，优先精确标题 + 年份匹配 */
    private Long resolveTmdbId(Movie movie) {
        String title = cleanTitle(movie.getName());
        if (title.isBlank()) {
            return null;
        }
        JsonNode raw;
        try {
            raw = client.searchMovie(title, 1);
        } catch (Exception e) {
            return null;
        }
        JsonNode results = raw.path("results");
        if (!results.isArray() || results.isEmpty()) {
            return null;
        }

        String wanted = normalizeTitle(title);
        int wantedYear = movie.getShowTime() == null ? 0 : movie.getShowTime().getYear();
        Long bestId = null;
        int bestScore = -1;
        for (JsonNode item : results) {
            String itemTitle = text(item, "title", "original_title");
            String normalizedItem = normalizeTitle(itemTitle);
            if (normalizedItem.isEmpty()) {
                continue;
            }
            int score = 0;
            if (normalizedItem.equals(wanted)) {
                score += 100;
            } else if (normalizedItem.contains(wanted) || wanted.contains(normalizedItem)) {
                score += 50;
            }
            String release = text(item, "release_date");
            if (wantedYear > 0 && release.length() >= 4) {
                try {
                    if (Integer.parseInt(release.substring(0, 4)) == wantedYear) {
                        score += 40;
                    }
                } catch (NumberFormatException ignored) {
                    // 日期不合法时不影响标题匹配
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestId = item.path("id").asLong();
            }
        }
        return bestScore > 0 && bestId != null && bestId > 0 ? bestId : null;
    }

    private String chooseRegion(JsonNode results, String preferred) {
        if (hasProviders(results.path(preferred))) {
            return preferred;
        }
        // 常见地区兜底；仍找不到就取第一个有平台数据的地区
        for (String fallback : List.of("US", "HK", "TW", "JP", "GB")) {
            if (hasProviders(results.path(fallback))) {
                return fallback;
            }
        }
        Iterator<String> names = results.fieldNames();
        while (names.hasNext()) {
            String region = names.next();
            if (hasProviders(results.path(region))) {
                return region;
            }
        }
        return preferred;
    }

    private boolean hasProviders(JsonNode regionNode) {
        if (regionNode == null || !regionNode.isObject()) {
            return false;
        }
        for (String key : List.of("flatrate", "free", "ads", "rent", "buy")) {
            JsonNode list = regionNode.path(key);
            if (list.isArray() && !list.isEmpty()) {
                return true;
            }
        }
        return false;
    }

    private static String cleanTitle(String value) {
        if (value == null) return "";
        return value.replaceAll("\\s*[（(]\\d{4}[)）]\\s*$", "").trim();
    }

    private static String normalizeTitle(String value) {
        return value == null ? "" : value.toLowerCase()
                .replaceAll("\\s+", "")
                .replaceAll("[\\p{Punct}，。！？、：；（）()《》·]", "");
    }

    private static String tmdbSearchUrl(String title) {
        return "https://www.themoviedb.org/search?query="
                + URLEncoder.encode(title == null ? "" : title, StandardCharsets.UTF_8);
    }

    /** 批量导入，返回成功/已存在/失败明细 */
    public Map<String, Object> importMovies(List<Long> tmdbIds) {        List<Map<String, Object>> imported = new ArrayList<>();
        List<Map<String, Object>> existed = new ArrayList<>();
        List<Map<String, Object>> failed = new ArrayList<>();
        for (Long tmdbId : tmdbIds) {
            if (tmdbId == null) {
                continue;
            }
            try {
                Map<String, Object> result = importMovie(tmdbId);
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("tmdbId", tmdbId);
                item.put("movieId", result.get("movie") instanceof Movie movie ? movie.getId() : null);
                if (Boolean.TRUE.equals(result.get("existed"))) {
                    existed.add(item);
                } else {
                    imported.add(item);
                }
            } catch (Exception e) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("tmdbId", tmdbId);
                item.put("error", e.getMessage());
                failed.add(item);
            }
        }
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("imported", imported);
        summary.put("existed", existed);
        summary.put("failed", failed);
        summary.put("importedCount", imported.size());
        summary.put("existedCount", existed.size());
        summary.put("failedCount", failed.size());
        return summary;
    }

    private String storePoster(String posterPath) {
        if (posterPath == null || posterPath.isEmpty()) {
            return "";
        }
        String url = TmdbProperties.IMAGE_BASE + props.getPosterSize() + posterPath;
        if (!props.isImportDownloadImage()) {
            return url;
        }
        try {
            byte[] bytes = client.downloadImage(url);
            return MinioUtil.UploadFile("movie/cover/" + UUID.randomUUID() + ".jpg",
                    new ByteArrayInputStream(bytes));
        } catch (Exception e) {
            return url;
        }
    }

    private String resolveDirector(JsonNode detail) {
        for (JsonNode crew : detail.path("credits").path("crew")) {
            if ("Director".equalsIgnoreCase(crew.path("job").asText(""))) {
                return crew.path("name").asText("");
            }
        }
        return "";
    }

    private String resolveActors(JsonNode detail, int limit) {
        List<String> names = new ArrayList<>();
        for (JsonNode cast : detail.path("credits").path("cast")) {
            names.add(cast.path("name").asText(""));
            if (names.size() >= limit) {
                break;
            }
        }
        return String.join(" / ", names);
    }

    private String resolveGenres(JsonNode detail) {
        List<String> names = new ArrayList<>();
        for (JsonNode genre : detail.path("genres")) {
            names.add(genre.path("name").asText(""));
        }
        return String.join(",", names);
    }

    private Long ensureCategory(String name) {
        Category existing = categoryMapper.selectOne(
                new LambdaQueryWrapper<Category>().eq(Category::getName, name).last("LIMIT 1"));
        if (existing != null) {
            return existing.getId();
        }
        Category category = new Category();
        category.setName(name);
        category.setDescription("来自 TMDB 的分类");
        category.setParentId(0L);
        category.setSortOrder(0);
        category.setCreateTime(LocalDateTime.now());
        category.setUpdateTime(LocalDateTime.now());
        categoryMapper.insert(category);
        Category saved = categoryMapper.selectOne(
                new LambdaQueryWrapper<Category>().eq(Category::getName, name).last("LIMIT 1"));
        return saved != null ? saved.getId() : category.getId();
    }

    private Long ensureTag(String name) {
        Tag existing = tagMapper.selectOne(
                new LambdaQueryWrapper<Tag>().eq(Tag::getName, name).last("LIMIT 1"));
        if (existing != null) {
            return existing.getId();
        }
        Tag tag = new Tag();
        tag.setName(name);
        tag.setDescription("来自 TMDB 的标签");
        tag.setCreateTime(LocalDateTime.now());
        tag.setUpdateTime(LocalDateTime.now());
        tagMapper.insert(tag);
        Tag saved = tagMapper.selectOne(
                new LambdaQueryWrapper<Tag>().eq(Tag::getName, name).last("LIMIT 1"));
        return saved != null ? saved.getId() : tag.getId();
    }

    private void linkCategory(Long movieId, Long categoryId) {
        if (movieId == null || categoryId == null) {
            return;
        }
        Long count = movieCategoryMapper.selectCount(
                new LambdaQueryWrapper<MovieCategory>()
                        .eq(MovieCategory::getMovieId, movieId)
                        .eq(MovieCategory::getCategoryId, categoryId));
        if (count == null || count == 0) {
            MovieCategory link = new MovieCategory();
            link.setMovieId(movieId);
            link.setCategoryId(categoryId);
            movieCategoryMapper.insert(link);
        }
    }

    private void linkTag(Long movieId, Long tagId) {
        if (movieId == null || tagId == null) {
            return;
        }
        Long count = movieTagMapper.selectCount(
                new LambdaQueryWrapper<MovieTag>()
                        .eq(MovieTag::getMovieId, movieId)
                        .eq(MovieTag::getTagId, tagId));
        if (count == null || count == 0) {
            MovieTag link = new MovieTag();
            link.setMovieId(movieId);
            link.setTagId(tagId);
            movieTagMapper.insert(link);
        }
    }

    private static String text(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode value = node.get(key);
            if (value != null && !value.isNull()) {
                String s = value.asText("");
                if (!s.isEmpty()) {
                    return s;
                }
            }
        }
        return "";
    }
}
