package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.BookFacets;
import com.xupt.book.DTO.Result;
import com.xupt.book.Mapper.BookChapterMapper;
import com.xupt.book.Mapper.BookFavoriteMapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Mapper.BookTypeMapper;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookChapter;
import com.xupt.book.Pojo.BookFavorite;
import com.xupt.book.Pojo.BookType;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BookService {

    @Resource
    private BookMapper bookMapper;

    @Resource
    private BookTypeMapper bookTypeMapper;

    @Resource
    private BookFavoriteMapper bookFavoriteMapper;

    @Resource
    private BookChapterMapper bookChapterMapper;

    // 分页查询书籍信息列表（不带筛选，保留给内部调用）
    public Result<Page<Book>> getBookList(int page, int size) {
        return getBookList(page, size, null, null, null, null, null);
    }

    /**
     * 分页查询书籍，支持分面筛选与排序。
     *
     * <p>筛选值用**逗号分隔的字符串**传递（axios 默认把数组序列化成 {@code k[]=v}，
     * Spring 的 {@code @RequestParam} 绑定不了，所以统一走 {@code typeIds=1,2} 这种形式）。
     * 传 null 或空串表示该维度不筛选。
     *
     * @param typeIds   类型 id 列表，逗号分隔
     * @param authors   作者名列表，逗号分隔（精确匹配，与分面计数口径一致）
     * @param sources   数据来源列表，逗号分隔
     * @param sortField 排序字段：bookName / bookAuthor / chapterCount / createTime，其它值回落按入库时间倒序
     * @param sortOrder asc / desc
     */
    public Result<Page<Book>> getBookList(int page, int size, String typeIds, String authors,
                                          String sources, String sortField, String sortOrder) {
        try {
            Page<Book> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();

            applyFacets(queryWrapper, typeIds, authors, sources);
            applySort(queryWrapper, sortField, sortOrder);

            bookMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询书籍列表失败: " + e.getMessage());
        }
    }

    /**
     * 图书浏览页左侧筛选栏的分面数据：类型 / 作者 / 来源 各自的可选值与全库计数。
     *
     * <p>只 select 参与分面的三列，避免把 {@code book_details} 这种大字段拉回来。
     * {@code type_id} / 作者 / 来源为空的记录不计入任何分面（但仍算在 total 里），
     * 因此筛选不到「未归类」的书——它们在「全部」里照常可见。
     */
    public Result<BookFacets> getBookFacets() {
        try {
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.select(Book::getTypeId, Book::getBookAuthor, Book::getSource);
            List<Book> books = bookMapper.selectList(queryWrapper);

            Map<Integer, String> typeNameById = bookTypeMapper.selectList(null).stream()
                    .filter(t -> t.getId() != null)
                    .collect(Collectors.toMap(BookType::getId,
                            t -> t.getTypeName() == null || t.getTypeName().isBlank() ? "未命名" : t.getTypeName(),
                            (a, b) -> a));

            Map<Integer, Integer> typeCounts = new HashMap<>();
            Map<String, Integer> authorCounts = new HashMap<>();
            Map<String, Integer> sourceCounts = new HashMap<>();

            for (Book b : books) {
                if (b.getTypeId() != null) {
                    typeCounts.merge(b.getTypeId(), 1, Integer::sum);
                }
                if (b.getBookAuthor() != null && !b.getBookAuthor().isBlank()) {
                    authorCounts.merge(b.getBookAuthor(), 1, Integer::sum);
                }
                if (b.getSource() != null && !b.getSource().isBlank()) {
                    sourceCounts.merge(b.getSource(), 1, Integer::sum);
                }
            }

            List<BookFacets.FacetItem> types = typeCounts.entrySet().stream()
                    .map(e -> new BookFacets.FacetItem(String.valueOf(e.getKey()),
                            typeNameById.getOrDefault(e.getKey(), "未知类型"), e.getValue()))
                    .sorted(facetOrder())
                    .toList();

            List<BookFacets.FacetItem> authors = authorCounts.entrySet().stream()
                    .map(e -> new BookFacets.FacetItem(e.getKey(), e.getKey(), e.getValue()))
                    .sorted(facetOrder())
                    .toList();

            List<BookFacets.FacetItem> sources = sourceCounts.entrySet().stream()
                    .map(e -> new BookFacets.FacetItem(e.getKey(), e.getKey(), e.getValue()))
                    .sorted(facetOrder())
                    .toList();

            BookFacets facets = new BookFacets(types, authors, sources, books.size());
            return Result.success(facets);
        } catch (Exception e) {
            return Result.error(500, "查询分面数据失败: " + e.getMessage());
        }
    }

    /** 分面排序：数量多的在前，数量相同按名称升序，保证每次返回顺序稳定 */
    private Comparator<BookFacets.FacetItem> facetOrder() {
        return Comparator.comparing(BookFacets.FacetItem::getCount).reversed()
                .thenComparing(BookFacets.FacetItem::getLabel);
    }

    /**
     * 把分面筛选条件叠加到查询上。
     *
     * <p>三个维度都是「多选精确匹配」（与分面计数的口径一致），传空表示不筛选。
     * 精确匹配而非模糊，是因为分面里的作者名本身就是全量值。
     */
    private void applyFacets(LambdaQueryWrapper<Book> wrapper, String typeIds, String authors, String sources) {
        List<Integer> typeIdList = parseIntegerList(typeIds);
        if (!typeIdList.isEmpty()) {
            wrapper.in(Book::getTypeId, typeIdList);
        }
        List<String> authorList = parseStringList(authors);
        if (!authorList.isEmpty()) {
            wrapper.in(Book::getBookAuthor, authorList);
        }
        List<String> sourceList = parseStringList(sources);
        if (!sourceList.isEmpty()) {
            wrapper.in(Book::getSource, sourceList);
        }
    }

    /**
     * 应用排序。字段走白名单映射到方法引用（不拼接 SQL，天然防注入），
     * 未知字段回落「按入库时间倒序」，与原行为一致。
     * 末尾统一补一个 id 升序做次序键，避免同一时间戳的记录在翻页时抖动。
     */
    private void applySort(LambdaQueryWrapper<Book> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "" : sortField;
        switch (field) {
            case "bookName" -> wrapper.orderBy(true, asc, Book::getBookName);
            case "bookAuthor" -> wrapper.orderBy(true, asc, Book::getBookAuthor);
            case "chapterCount" -> wrapper.orderBy(true, asc, Book::getChapterCount);
            case "createTime" -> wrapper.orderBy(true, asc, Book::getCreateTime);
            default -> wrapper.orderByDesc(Book::getCreateTime);
        }
        wrapper.orderByAsc(Book::getId);
    }

    /** "1,2,3" → [1,2,3]；非法项与空项直接跳过 */
    private List<Integer> parseIntegerList(String raw) {
        List<Integer> result = new ArrayList<>();
        for (String part : parseStringList(raw)) {
            try {
                result.add(Integer.valueOf(part));
            } catch (NumberFormatException ignored) {
                // 非法 id 忽略，不影响其它筛选条件
            }
        }
        return result;
    }

    /** "a,b" → [a,b]，去空白、去空项 */
    private List<String> parseStringList(String raw) {
        List<String> result = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            return result;
        }
        for (String part : raw.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    // 查询所有书籍信息列表
    public Result<List<Book>> getAllBooks() {
        try {
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByDesc(Book::getCreateTime);
            List<Book> books = bookMapper.selectList(queryWrapper);
            return Result.success(books);
        } catch (Exception e) {
            return Result.error(500, "查询所有书籍失败: " + e.getMessage());
        }
    }

    // 获取书籍详细信息
    public Result<Book> getBookById(Integer id) {
        try {
            Book book = bookMapper.selectById(id);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            return Result.success(book);
        } catch (Exception e) {
            return Result.error(500, "查询书籍详情失败: " + e.getMessage());
        }
    }

    // 获取书籍总数
    public Integer getBookCount() {
        try {
            return bookMapper.selectCount(null).intValue();
        } catch (Exception e) {
            return 0;
        }
    }

    // 新增书籍
    public Result<?> addBook(Book book) {
        try {
            if (book.getBookName() == null || book.getBookName().trim().isEmpty()) {
                return Result.error(400, "书籍名称不能为空");
            }
            book.setCreateTime(LocalDateTime.now());
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.insert(book);
            // 返回实体：MyBatis-Plus 会把自增 id 回填，前端随后要用它上传封面
            return Result.success(book);
        } catch (Exception e) {
            return Result.error(500, "新增书籍失败: " + e.getMessage());
        }
    }

    // 修改书籍
    public Result<?> updateBook(Book book) {
        try {
            if (book.getId() == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book existingBook = bookMapper.selectById(book.getId());
            if (existingBook == null) {
                return Result.error(404, "书籍不存在");
            }
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.updateById(book);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改书籍失败: " + e.getMessage());
        }
    }

    // 删除书籍
    public Result<?> deleteBook(Integer id) {
        try {
            Book book = bookMapper.selectById(id);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            bookMapper.deleteById(id);
            // 级联清理收藏与章节，避免留下孤儿记录（最近观看的本地快照由前端清理）
            bookFavoriteMapper.delete(new LambdaQueryWrapper<BookFavorite>().eq(BookFavorite::getBookId, id));
            bookChapterMapper.delete(new LambdaQueryWrapper<BookChapter>().eq(BookChapter::getBookId, id));
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除书籍失败: " + e.getMessage());
        }
    }

    // 修改书籍封面
    public Result<?> updateCover(Integer bookId, String filePath) {
        try {
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            book.setBookImg(filePath);
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.updateById(book);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改书籍封面失败: " + e.getMessage());
        }
    }

    // 模糊查询书籍信息列表（不带筛选，保留给内部调用）
    public Result<Page<Book>> searchBookList(int page, int size, String keyword) {
        return searchBookList(page, size, keyword, null, null, null, null, null);
    }

    /**
     * 模糊查询书籍列表，支持分面筛选与排序。
     *
     * <p>关键词的三个 {@code like} 用 {@code and(...)} **包成一组**：
     * 否则叠加筛选条件后 SQL 会变成 {@code a LIKE x OR b LIKE y OR c LIKE z AND type_id IN (...)}，
     * 由于 AND 优先级高于 OR，筛选只会作用在最后一个 like 上，语义就错了。
     */
    public Result<Page<Book>> searchBookList(int page, int size, String keyword, String typeIds,
                                             String authors, String sources, String sortField, String sortOrder) {
        try {
            Page<Book> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            // 占位符写的是「书名或作者」，这里把作者与简介也纳入模糊匹配
            queryWrapper.and(w -> w.like(Book::getBookName, keyword)
                    .or()
                    .like(Book::getBookAuthor, keyword)
                    .or()
                    .like(Book::getBookDetails, keyword));

            applyFacets(queryWrapper, typeIds, authors, sources);
            applySort(queryWrapper, sortField, sortOrder);

            bookMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "模糊查询书籍列表失败: " + e.getMessage());
        }
    }

    // 根据作者模糊查询书籍列表
    public Result<Page<Book>> searchAuthorList(int page, int size, String keyword) {
        try {
            Page<Book> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.like(Book::getBookAuthor, keyword)
                    .orderByDesc(Book::getCreateTime);
            bookMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "根据作者模糊查询书籍列表失败: " + e.getMessage());
        }
    }

    // ============================================================
    // 图书文件
    // ============================================================

    /**
     * 绑定图书文件：文件已转存 MinIO 后回写 {@code file_*} 字段。
     *
     * <p>注意 {@code updateById} 会忽略 null 字段，所以这里先把实体查出来再改，
     * 避免把其它列冲成 null。
     */
    public Result<?> attachFile(Integer bookId, String fileKey, String fileFormat, long fileSize, String fileName) {
        try {
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            book.setFileKey(fileKey);
            book.setFileFormat(fileFormat);
            book.setFileSize(fileSize);
            book.setFileName(fileName);
            book.setFileUploadedAt(LocalDateTime.now());
            book.setUpdateTime(LocalDateTime.now());
            bookMapper.updateById(book);
            return Result.success(book);
        } catch (Exception e) {
            return Result.error(500, "绑定图书文件失败: " + e.getMessage());
        }
    }

    /** 解绑图书文件：清空 {@code file_*} 字段（对象存储里的文件由调用方删除） */
    public Result<?> clearFile(Integer bookId) {
        try {
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            // updateById 忽略 null，所以要显式置空
            LambdaUpdateWrapper<Book> update = new LambdaUpdateWrapper<>();
            update.eq(Book::getId, bookId)
                    .set(Book::getFileKey, null)
                    .set(Book::getFileFormat, null)
                    .set(Book::getFileSize, null)
                    .set(Book::getFileName, null)
                    .set(Book::getFileUploadedAt, null)
                    .set(Book::getUpdateTime, LocalDateTime.now());
            bookMapper.update(null, update);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "解绑图书文件失败: " + e.getMessage());
        }
    }

    /** 更新封面地址（本地抽取的封面转存 MinIO 后回写） */
    public Result<?> updateCoverUrl(Integer bookId, String coverUrl) {
        return updateCover(bookId, coverUrl);
    }

    /**
     * 设置 / 取消元数据锁定（阶段 6）。
     *
     * <p>锁定后批量刷新与 BookDrop 不再自动改写这本书的元数据。
     */
    public Result<?> setMetadataLocked(Integer bookId, boolean locked) {
        try {
            if (bookId == null) {
                return Result.error(400, "书籍ID不能为空");
            }
            Book book = bookMapper.selectById(bookId);
            if (book == null) {
                return Result.error(404, "书籍不存在");
            }
            LambdaUpdateWrapper<Book> update = new LambdaUpdateWrapper<>();
            update.eq(Book::getId, bookId)
                    .set(Book::getMetadataLocked, locked)
                    .set(Book::getUpdateTime, LocalDateTime.now());
            bookMapper.update(null, update);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "设置元数据锁定失败: " + e.getMessage());
        }
    }
}