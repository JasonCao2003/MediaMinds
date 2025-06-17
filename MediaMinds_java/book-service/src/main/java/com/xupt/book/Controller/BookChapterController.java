package com.xupt.book.Controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.BookChapter;
import com.xupt.book.Service.BookChapterService;
import com.xupt.book.Utils.AliOssUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/book/chapter")
@Tag(name = "书籍章节管理接口", description = "管理书籍章节的增删改查功能")
public class BookChapterController {

    @Resource
    private BookChapterService chapterService;

    // 查询章节列表（全部）
    @Operation(summary = "查询章节列表", description = "根据书籍 ID 查询所有章节列表")
    @GetMapping("/list")
    public Result<List<BookChapter>> getChapterList(
            @Parameter(description = "书籍 ID", required = true, example = "1") @RequestParam Integer bookId) {
        return chapterService.getAllChapters(bookId);
    }

    // 分页查询章节列表
    @Operation(summary = "分页查询章节列表", description = "根据书籍 ID 分页查询章节列表")
    @GetMapping("/page")
    public Result<Page<BookChapter>> getChaptersByPage(
            @Parameter(description = "书籍 ID", required = true, example = "1") @RequestParam Integer bookId,
            @Parameter(description = "当前页码，默认1", example = "1") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页记录数，默认10", example = "10") @RequestParam(defaultValue = "10") int size) {
        return chapterService.getChapterList(bookId, page, size);
    }

    // 获取章节详细信息
    @Operation(summary = "查询章节详情", description = "根据章节 ID 查询章节详细信息")
    @GetMapping("/{id}")
    public Result<BookChapter> getChapterById(
            @Parameter(description = "章节 ID", required = true, example = "1") @PathVariable Integer id) {
        return chapterService.getChapterById(id);
    }

    // 新增章节
    @Operation(summary = "新增章节", description = "添加新的书籍章节")
    @PostMapping
    public Result<?> addChapter(
            @Parameter(description = "章节信息", required = true) @RequestBody BookChapter chapter) {
        return chapterService.addChapter(chapter);
    }

    // 修改章节
    @Operation(summary = "修改章节", description = "更新指定章节的信息")
    @PutMapping
    public Result<?> updateChapter(
            @Parameter(description = "章节信息", required = true) @RequestBody BookChapter chapter) {
        return chapterService.updateChapter(chapter);
    }

    // 删除章节
    @Operation(summary = "删除章节", description = "根据章节 ID 删除章节")
    @DeleteMapping("/{id}")
    public Result<?> deleteChapter(
            @Parameter(description = "章节 ID", required = true, example = "1") @PathVariable Integer id) {
        return chapterService.deleteChapter(id);
    }

    // 获取章节内容（代理方式解决CORS问题）
    @Operation(summary = "获取章节内容", description = "通过代理方式获取章节内容文件，解决CORS问题")
    @GetMapping("/content/{id}")
    public Result<String> getChapterContent(
            @Parameter(description = "章节 ID", required = true, example = "1") @PathVariable Integer id) {
        return chapterService.getChapterContent(id);
    }

    // 测试接口：通过文件路径获取内容
    @Operation(summary = "测试直接获取文件内容", description = "直接通过文件路径获取内容，用于测试")
    @GetMapping("/test-content")
    public Result<String> testGetContent(
            @Parameter(description = "文件路径", required = true) @RequestParam String path) {
        try {
            String content = com.xupt.book.Utils.AliOssUtil.downloadFile(path);
            return Result.success(content);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "获取内容失败: " + e.getMessage());
        }
    }
}