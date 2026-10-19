package com.xupt.book.file;

import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Service.BookService;
import com.xupt.book.Utils.MinioUtil;
import com.xupt.book.file.chapter.BookChapterBuildService;
import com.xupt.book.metadata.BookMetadataProvider;
import com.xupt.book.metadata.BookMetadataProviderRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * 图书文件的落库与读取。
 *
 * <p>职责：
 * <ul>
 *   <li><b>入库</b>：把暂存文件转存 MinIO、回写 {@code file_*} 字段、可选地把本地抽取的封面也存进 MinIO</li>
 *   <li><b>缓存</b>：EPUB / CBZ 都是 ZIP，阅读时要按需取单个 entry。这里把 MinIO 上的文件
 *       在本地缓存一份，配合 {@code ZipFile} 随机读，避免每次请求都拉整个文件</li>
 *   <li><b>删除</b>：清 MinIO 对象 + 本地缓存 + 置空字段</li>
 * </ul>
 */
@Slf4j
@Service
public class BookFileService {

    /** MinIO 对象前缀 */
    private static final String FILE_PREFIX = "book/file/";
    private static final String COVER_PREFIX = "book/cover/";

    private final BookFileProperties properties;
    private final StagingService stagingService;
    private final BookFileExtractorFactory extractorFactory;
    private final BookService bookService;
    private final BookMetadataProviderRegistry providerRegistry;
    /**
     * 延迟注入：章节拆分器依赖本服务（ensureCached），直接构造注入会形成循环。
     * 只在真正需要生成 / 清理章节时才取实例。
     */
    private final ObjectProvider<BookChapterBuildService> chapterBuildProvider;

    public BookFileService(BookFileProperties properties,
                           StagingService stagingService,
                           BookFileExtractorFactory extractorFactory,
                           BookService bookService,
                           BookMetadataProviderRegistry providerRegistry,
                           ObjectProvider<BookChapterBuildService> chapterBuildProvider) {
        this.properties = properties;
        this.stagingService = stagingService;
        this.extractorFactory = extractorFactory;
        this.bookService = bookService;
        this.providerRegistry = providerRegistry;
        this.chapterBuildProvider = chapterBuildProvider;
    }

    /**
     * 用暂存文件正式入库：建记录 → 转存 MinIO → 回写文件字段 →（可选）抽取封面。
     *
     * <p>两种入库入口（在线检索后上传 / 直接上传后本地抽取）最终都走这里——
     * 差别只是 {@code book} 里的元数据来自在线源还是本地抽取。
     *
     * @param token             暂存令牌
     * @param book              元数据（不含 id；由本方法创建）
     * @param useExtractedCover 书没有封面时，是否用文件里抽取的封面
     */
    public Result<?> importWithFile(String token, Book book, boolean useExtractedCover) {
        return importWithFile(token, book, useExtractedCover, false);
    }

    /**
     * 用暂存文件正式入库（可同时生成章节）。
     *
     * @param generateChapters 是否在文件入库后自动拆分 EPUB / PDF 章节（只写指针，不复制正文）
     */
    public Result<?> importWithFile(String token, Book book, boolean useExtractedCover, boolean generateChapters) {
        StagedFile staged;
        try {
            staged = stagingService.require(token);
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
        if (book == null || book.getBookName() == null || book.getBookName().isBlank()) {
            return Result.error(400, "书籍名称不能为空");
        }
        if (book.getSource() == null || book.getSource().isBlank()) {
            book.setSource("upload");
        }

        // ① 建记录（拿自增 id，后面对象名要用）
        Result<?> created = bookService.addBook(book);
        if (created.getCode() == null || created.getCode() != 200 || !(created.getData() instanceof Book saved)) {
            return created;
        }
        Integer bookId = saved.getId();

        // ② 转存 MinIO
        String extension = staged.format().extension();
        String objectName = FILE_PREFIX + bookId + "/" + UUID.randomUUID() + extension;
        try {
            MinioUtil.uploadFile(objectName, staged.path().toFile(), staged.format().contentType());
        } catch (Exception e) {
            log.error("转存图书文件到 MinIO 失败 bookId={}: {}", bookId, e.toString());
            // 文件没存上就把刚建的记录删掉，避免留下一条「有元数据无文件」的脏数据
            bookService.deleteBook(bookId);
            return Result.error(500, "文件转存失败: " + e.getMessage());
        }

        // ③ 回写文件字段
        bookService.attachFile(bookId, objectName, staged.format().name().toLowerCase(),
                staged.size(), staged.originalName());

        // ④ 封面：仅当用户没提供封面、且用户同意用抽取的封面时
        if (useExtractedCover && (saved.getBookImg() == null || saved.getBookImg().isBlank())) {
            String coverUrl = extractAndStoreCover(staged, bookId);
            if (coverUrl != null) {
                bookService.updateCoverUrl(bookId, coverUrl);
            }
        }

        // ⑤ 自动生成章节（只写 epub:// / pdf:// 指针，不复制正文）
        if (generateChapters) {
            try {
                chapterBuildProvider.getObject().rebuild(bookId);
            } catch (Exception e) {
                // 章节生成失败不影响入库，用户可在详情页手动重建
                log.warn("自动生成章节失败 bookId={}: {}", bookId, e.toString());
            }
        }

        // ⑥ 暂存文件用完即弃
        stagingService.discard(token);

        Result<Book> detail = bookService.getBookById(bookId);
        return Result.success(detail.getData());
    }

    /**
     * 用「在线源的元信息 + 暂存文件」入库。
     *
     * <p>对应入口①：用户在线搜到书 → 详情页点「上传图书」。
     * 元信息由后端直接向在线源取（复用各书源自己的映射），前端只需给 source + id。
     */
    public Result<?> importFromProvider(String token, String source, String providerId,
                                        boolean useExtractedCover, boolean generateChapters) {
        if (providerId == null || providerId.isBlank()) {
            return Result.error(400, "缺少在线图书 ID");
        }
        BookMetadataProvider provider = providerRegistry.get(source);
        if (provider == null) {
            return Result.error(400, "未知的在线书源: " + source);
        }
        Book book;
        try {
            book = provider.buildBook(providerId);
        } catch (NumberFormatException e) {
            return Result.error(400, "非法的书目 ID: " + providerId);
        } catch (UnsupportedOperationException e) {
            return Result.error(400, "该数据源暂不支持带文件入库: " + source);
        } catch (Exception e) {
            return Result.error(500, "获取在线元信息失败: " + e.getMessage());
        }
        if (book == null) {
            return Result.error(400, "在线源没有找到该书: " + providerId);
        }
        return importWithFile(token, book, useExtractedCover, generateChapters);
    }

    /** 抽取封面并转存 MinIO；没有封面或失败返回 null（不影响入库） */
    private String extractAndStoreCover(StagedFile staged, Integer bookId) {
        try {
            CoverImage cover = extractorFactory.get(staged.format()).extractCover(staged.path());
            if (cover == null || cover.data() == null || cover.data().length == 0) {
                return null;
            }
            String objectName = COVER_PREFIX + bookId + "/" + UUID.randomUUID() + cover.extension();
            try (var in = new java.io.ByteArrayInputStream(cover.data())) {
                return MinioUtil.UploadFile(objectName, in, cover.contentType());
            }
        } catch (Exception e) {
            log.warn("抽取 / 转存封面失败 bookId={}: {}", bookId, e.toString());
            return null;
        }
    }

    /**
     * 按 id 取书，且该书必须有上传文件；否则返回 {@code null}。
     *
     * <p>读取类接口的入口：拿到的 {@code Book} 直接交给 {@link #ensureCached}。
     */
    public Book loadBookWithFile(Integer bookId) {
        if (bookId == null) {
            return null;
        }
        Book book = bookService.getBookById(bookId).getData();
        if (book == null || book.getFileKey() == null || book.getFileKey().isBlank()) {
            return null;
        }
        return book;
    }

    /** 删除图书文件：MinIO 对象 + 本地缓存 + 字段 */
    public Result<?> deleteFile(Integer bookId) {
        Book book = bookService.getBookById(bookId).getData();
        if (book == null) {
            return Result.error(404, "书籍不存在");
        }
        if (book.getFileKey() != null && !book.getFileKey().isBlank()) {
            try {
                MinioUtil.deleteFile(book.getFileKey());
            } catch (Exception e) {
                log.warn("删除 MinIO 对象失败 bookId={} key={}: {}", bookId, book.getFileKey(), e.toString());
            }
        }
        evictCache(bookId);
        // 指针章节的正文来自文件，文件没了就一并清掉
        try {
            chapterBuildProvider.getObject().clearGeneratedChapters(bookId);
        } catch (Exception e) {
            log.warn("清理生成的章节失败 bookId={}: {}", bookId, e.toString());
        }
        return bookService.clearFile(bookId);
    }

    /**
     * 确保本地有一份缓存副本，返回其路径。
     *
     * <p>EPUB / CBZ 的资源读取都基于这个副本做 {@code ZipFile} 随机读。
     */
    public Path ensureCached(Book book) throws Exception {
        if (book == null || book.getFileKey() == null || book.getFileKey().isBlank()) {
            throw new IllegalStateException("该书没有上传文件");
        }
        Path cached = cachePath(book);
        if (Files.isRegularFile(cached) && Files.size(cached) > 0) {
            return cached;
        }
        Files.createDirectories(cached.getParent());
        MinioUtil.downloadToFile(book.getFileKey(), cached.toFile());
        return cached;
    }

    /** 缓存路径：{cache}/{bookId}/book.{ext} */
    public Path cachePath(Book book) {
        String extension = book.getFileFormat() == null ? ".bin" : "." + book.getFileFormat();
        return properties.cacheDir().resolve(String.valueOf(book.getId())).resolve("book" + extension);
    }

    /** 清掉某本书的本地缓存（重新上传或删除时调用） */
    public void evictCache(Integer bookId) {
        if (bookId == null) {
            return;
        }
        Path dir = properties.cacheDir().resolve(String.valueOf(bookId));
        if (!Files.exists(dir)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // 尽力清理
                }
            });
        } catch (IOException ignored) {
            // 尽力清理
        }
    }
}
