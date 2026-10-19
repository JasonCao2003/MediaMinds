package com.xupt.book.file;

import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Book;
import com.xupt.book.file.chapter.BookChapterBuildService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 图书文件入库接口。
 *
 * <p>对应两种入库入口，最终都汇聚到 {@code /import}：
 * <ol>
 *   <li><b>在线检索后上传</b>：用户在线搜到书 → 详情页点「上传图书」→ 先调 staging 拿文件，
 *       再带上在线源的元数据调 import</li>
 *   <li><b>直接上传</b>：用户先传文件 → staging 返回本地抽取的元数据 → 前端预填表单
 *       （期间可再检索在线源补全）→ 用户确认后调 import</li>
 * </ol>
 */
@Slf4j
@RestController
@RequestMapping("/v1/book/file")
@Tag(name = "图书文件接口", description = "上传图书文件、抽取元数据、入库")
public class BookFileController {

    private final StagingService stagingService;
    private final BookFileService bookFileService;
    private final BookFileExtractorFactory extractorFactory;
    private final BookFileReaderService readerService;
    private final BookDropService bookDropService;
    private final BookFileWriteBackService writeBackService;
    private final BookChapterBuildService chapterBuildService;

    public BookFileController(StagingService stagingService,
                              BookFileService bookFileService,
                              BookFileExtractorFactory extractorFactory,
                              BookFileReaderService readerService,
                              BookDropService bookDropService,
                              BookFileWriteBackService writeBackService,
                              BookChapterBuildService chapterBuildService) {
        this.stagingService = stagingService;
        this.bookFileService = bookFileService;
        this.extractorFactory = extractorFactory;
        this.readerService = readerService;
        this.bookDropService = bookDropService;
        this.writeBackService = writeBackService;
        this.chapterBuildService = chapterBuildService;
    }

    @Operation(summary = "支持的文件格式", description = "返回可入库的格式，前端据此做上传前校验")
    @GetMapping("/formats")
    public Result<List<String>> formats() {
        return Result.success(extractorFactory.supportedFormats().stream()
                .map(f -> f.name().toLowerCase())
                .toList());
    }

    @Operation(summary = "上传图书文件（暂存 + 抽取元数据）",
            description = "文件先落暂存目录并抽取元数据，**此时不落库、不进对象存储**。"
                    + "返回令牌与抽取结果，用户确认后再调 /import 正式入库。")
    @PostMapping("/staging")
    public Result<StagingResult> staging(
            @Parameter(description = "图书文件（EPUB / PDF / CBZ）") @RequestParam("file") MultipartFile file) {
        try {
            return Result.success(stagingService.stage(file));
        } catch (IllegalArgumentException e) {
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            log.error("暂存图书文件失败: {}", e.toString(), e);
            return Result.error(500, "上传失败: " + e.getMessage());
        }
    }

    @Operation(summary = "取暂存文件的封面", description = "按需抽取，不预先落盘——用户放弃时不会留下孤儿封面")
    @GetMapping("/staging/{token}/cover")
    public ResponseEntity<byte[]> stagingCover(@PathVariable String token) {
        try {
            CoverImage cover = stagingService.cover(token);
            if (cover == null || cover.data() == null || cover.data().length == 0) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, cover.contentType())
                    // 暂存文件生命周期很短，且内容可能被重新上传覆盖
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .body(cover.data());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "丢弃暂存文件", description = "用户取消上传时调用")
    @DeleteMapping("/staging/{token}")
    public Result<?> discardStaging(@PathVariable String token) {
        stagingService.discard(token);
        return Result.success();
    }

    @Operation(summary = "用暂存文件入库",
            description = "建记录 → 转存对象存储 → 回写文件字段 →（可选）采用抽取的封面 → 丢弃暂存")
    @PostMapping("/import")
    public Result<?> importBook(@RequestBody BookImportRequest request) {
        if (request == null || request.getToken() == null || request.getToken().isBlank()) {
            return Result.error(400, "缺少暂存令牌");
        }
        return bookFileService.importWithFile(request.getToken(), request.getBook(),
                request.isUseExtractedCover(), request.isGenerateChapters());
    }

    @Operation(summary = "用在线源元信息 + 暂存文件入库",
            description = "入口①：在线搜到书后，在详情里上传图书文件。元信息由后端向在线源取，前端只给 source 与 id。")
    @PostMapping("/import-from-provider")
    public Result<?> importFromProvider(@RequestBody ProviderImportRequest request) {
        if (request == null || request.getToken() == null || request.getToken().isBlank()) {
            return Result.error(400, "缺少暂存令牌");
        }
        return bookFileService.importFromProvider(request.getToken(), request.getSource(),
                request.getProviderId(), request.isUseExtractedCover(), request.isGenerateChapters());
    }

    @Operation(summary = "删除图书文件", description = "清对象存储 + 本地缓存 + 置空文件字段（不动书籍元数据）")
    @DeleteMapping("/{bookId}")
    public Result<?> deleteFile(@PathVariable Integer bookId) {
        return bookFileService.deleteFile(bookId);
    }

    @Operation(summary = "取图书文件原始字节", description = "PDF 交给浏览器原生查看器；EPUB / CBZ 走资源接口")
    @GetMapping("/{bookId}/raw")
    public ResponseEntity<byte[]> raw(@PathVariable Integer bookId) {
        try {
            Book book = bookFileService.loadBookWithFile(bookId);
            if (book == null) {
                return ResponseEntity.notFound().build();
            }
            byte[] data = java.nio.file.Files.readAllBytes(bookFileService.ensureCached(book));
            String contentType = book.getFileFormat() == null
                    ? MediaType.APPLICATION_OCTET_STREAM_VALUE
                    : BookFormat.valueOf(book.getFileFormat().toUpperCase()).contentType();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + (book.getFileName() == null ? "book" : book.getFileName()) + "\"")
                    .body(data);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ============================================================
    // 阶段 R：阅读（EPUB 资源 / CBZ 页图）
    // ============================================================

    @Operation(summary = "EPUB 目录", description = "按 spine 顺序返回章节列表，path 为该章在 ZIP 内的 entry 名")
    @GetMapping("/{bookId}/epub/manifest")
    public Result<?> epubManifest(@PathVariable Integer bookId) {
        Book book = bookFileService.loadBookWithFile(bookId);
        if (book == null || !"epub".equalsIgnoreCase(book.getFileFormat())) {
            return Result.error(404, "该书没有 EPUB 文件");
        }
        try {
            return Result.success(readerService.epubManifest(book));
        } catch (Exception e) {
            log.error("读取 EPUB 目录失败 bookId={}: {}", bookId, e.toString(), e);
            return Result.error(500, "读取 EPUB 目录失败: " + e.getMessage());
        }
    }

    @Operation(summary = "EPUB 资源", description = "读 ZIP 内的单个 entry（章节正文 / 图片 / CSS / 字体）")
    @GetMapping("/{bookId}/epub/resource")
    public ResponseEntity<byte[]> epubResource(@PathVariable Integer bookId,
                                               @RequestParam("path") String path) {
        try {
            Book book = bookFileService.loadBookWithFile(bookId);
            if (book == null || !"epub".equalsIgnoreCase(book.getFileFormat())) {
                return ResponseEntity.notFound().build();
            }
            BookFileReaderService.Resource resource = readerService.epubResource(book, path);
            if (resource == null || resource.data() == null || resource.data().length == 0) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, resource.contentType())
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                    .body(resource.data());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "CBZ 目录", description = "返回按自然序排好的页数")
    @GetMapping("/{bookId}/cbz/manifest")
    public Result<?> cbzManifest(@PathVariable Integer bookId) {
        Book book = bookFileService.loadBookWithFile(bookId);
        if (book == null || !"cbz".equalsIgnoreCase(book.getFileFormat())) {
            return Result.error(404, "该书没有 CBZ 文件");
        }
        try {
            return Result.success(readerService.cbzManifest(book));
        } catch (Exception e) {
            log.error("读取 CBZ 目录失败 bookId={}: {}", bookId, e.toString(), e);
            return Result.error(500, "读取 CBZ 目录失败: " + e.getMessage());
        }
    }

    @Operation(summary = "生成 / 重建章节",
            description = "从 EPUB 的 OPF spine 或 PDF 的标题 / 页窗口自动划分章节；只写 epub:// / pdf:// 指针，不复制正文")
    @PostMapping("/{bookId}/chapters/rebuild")
    public Result<?> rebuildChapters(@PathVariable Integer bookId) {
        try {
            return Result.success(chapterBuildService.rebuild(bookId));
        } catch (IllegalArgumentException e) {
            return Result.error(404, e.getMessage());
        } catch (Exception e) {
            log.error("重建章节失败 bookId={}: {}", bookId, e.toString(), e);
            return Result.error(500, "重建章节失败: " + e.getMessage());
        }
    }

    @Operation(summary = "把元数据写回 EPUB",
            description = "改写 OPF 里的 dc:title/creator/publisher/date/language/description，重新打包并覆盖 MinIO 上的原文件；只支持 EPUB")
    @PostMapping("/{bookId}/writeback")
    public Result<?> writeBack(@PathVariable Integer bookId) {
        return writeBackService.writeBack(bookId);
    }

    @Operation(summary = "扫描 BookDrop 目录",
            description = "把投递目录里的 EPUB / PDF / CBZ 自动抽取元数据并入库；定时扫描默认关闭，这里是手动触发")
    @PostMapping("/drop/scan")
    public Result<?> scanDrop() {
        return Result.success(bookDropService.scanOnce());
    }

    @Operation(summary = "CBZ 单页", description = "返回第 index 页（0 基）的图片字节")
    @GetMapping("/{bookId}/cbz/page/{index}")
    public ResponseEntity<byte[]> cbzPage(@PathVariable Integer bookId, @PathVariable int index) {
        try {
            Book book = bookFileService.loadBookWithFile(bookId);
            if (book == null || !"cbz".equalsIgnoreCase(book.getFileFormat())) {
                return ResponseEntity.notFound().build();
            }
            BookFileReaderService.Resource resource = readerService.cbzPage(book, index);
            if (resource == null || resource.data() == null || resource.data().length == 0) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, resource.contentType())
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                    .body(resource.data());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
