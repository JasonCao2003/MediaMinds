package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xupt.book.DTO.Result;
import com.xupt.book.Mapper.BookListItemMapper;
import com.xupt.book.Mapper.BookListMapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookList;
import com.xupt.book.Pojo.BookListItem;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 书单：收藏的集合。
 *
 * <p>一本书可以加入多个书单；图标点亮只表示「至少在某个书单里」。
 * 原来的 book_favorite 数据由迁移脚本归到「我的收藏」书单，接口不再使用旧表。
 */
@Service
public class BookListService {

    @Resource
    private BookListMapper listMapper;

    @Resource
    private BookListItemMapper itemMapper;

    @Resource
    private BookMapper bookMapper;

    public Result<List<BookList>> getLists(String userId) {
        List<BookList> lists = listMapper.selectList(new LambdaQueryWrapper<BookList>()
                .eq(BookList::getUserId, userId)
                .orderByDesc(BookList::getCreateTime));
        for (BookList list : lists) {
            list.setBookCount(itemMapper.selectCount(new LambdaQueryWrapper<BookListItem>()
                    .eq(BookListItem::getListId, list.getId())));
        }
        return Result.success(lists);
    }

    public Result<BookList> create(String userId, BookList input) {
        if (input == null || input.getName() == null || input.getName().isBlank()) {
            return Result.error(400, "书单名称不能为空");
        }
        String name = input.getName().trim();
        Long exists = listMapper.selectCount(new LambdaQueryWrapper<BookList>()
                .eq(BookList::getUserId, userId)
                .eq(BookList::getName, name));
        if (exists != null && exists > 0) {
            return Result.error(409, "已经有同名书单了");
        }
        BookList list = new BookList();
        list.setUserId(userId);
        list.setName(name);
        list.setDescription(input.getDescription() == null ? null : input.getDescription().trim());
        LocalDateTime now = LocalDateTime.now();
        list.setCreateTime(now);
        list.setUpdateTime(now);
        listMapper.insert(list);
        list.setBookCount(0L);
        return Result.success(list);
    }

    public Result<BookList> update(String userId, Long id, BookList input) {
        BookList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "书单不存在");
        }
        if (input == null || input.getName() == null || input.getName().isBlank()) {
            return Result.error(400, "书单名称不能为空");
        }
        String name = input.getName().trim();
        Long exists = listMapper.selectCount(new LambdaQueryWrapper<BookList>()
                .eq(BookList::getUserId, userId)
                .eq(BookList::getName, name)
                .ne(BookList::getId, id));
        if (exists != null && exists > 0) {
            return Result.error(409, "已经有同名书单了");
        }
        list.setName(name);
        list.setDescription(input.getDescription() == null ? null : input.getDescription().trim());
        list.setUpdateTime(LocalDateTime.now());
        listMapper.updateById(list);
        return Result.success(list);
    }

    public Result<?> delete(String userId, Long id) {
        BookList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "书单不存在");
        }
        itemMapper.delete(new LambdaQueryWrapper<BookListItem>().eq(BookListItem::getListId, id));
        listMapper.deleteById(id);
        return Result.success();
    }

    public Result<List<Book>> getBooks(String userId, Long id) {
        BookList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "书单不存在");
        }
        List<BookListItem> items = itemMapper.selectList(new LambdaQueryWrapper<BookListItem>()
                .eq(BookListItem::getListId, id)
                .orderByDesc(BookListItem::getCreateTime));
        if (items.isEmpty()) {
            return Result.success(List.of());
        }

        List<Integer> bookIds = items.stream().map(BookListItem::getBookId).distinct().toList();
        List<Book> books = bookMapper.selectList(new LambdaQueryWrapper<Book>().in(Book::getId, bookIds));
        Map<Integer, Book> byId = new LinkedHashMap<>();
        books.forEach(book -> byId.put(book.getId(), book));

        List<Book> ordered = new ArrayList<>();
        for (Integer bookId : bookIds) {
            Book book = byId.get(bookId);
            if (book != null) ordered.add(book);
        }
        return Result.success(ordered);
    }

    public Result<?> addBook(String userId, Long id, Integer bookId) {
        BookList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "书单不存在");
        }
        if (bookId == null || bookMapper.selectById(bookId) == null) {
            return Result.error(404, "图书不存在");
        }
        Long exists = itemMapper.selectCount(new LambdaQueryWrapper<BookListItem>()
                .eq(BookListItem::getListId, id)
                .eq(BookListItem::getBookId, bookId));
        if (exists != null && exists > 0) {
            return Result.error(409, "这本书已经在该书单里了");
        }
        BookListItem item = new BookListItem();
        item.setListId(id);
        item.setBookId(bookId);
        item.setCreateTime(LocalDateTime.now());
        itemMapper.insert(item);
        return Result.success();
    }

    public Result<?> removeBook(String userId, Long id, Integer bookId) {
        BookList list = owned(userId, id);
        if (list == null) {
            return Result.error(404, "书单不存在");
        }
        int removed = itemMapper.delete(new LambdaQueryWrapper<BookListItem>()
                .eq(BookListItem::getListId, id)
                .eq(BookListItem::getBookId, bookId));
        return removed > 0 ? Result.success() : Result.error(404, "这本书不在该书单中");
    }

    /** bookId → 包含它的书单 ID 列表，供卡片上的收藏图标点亮 */
    public Result<Map<Integer, List<Long>>> membership(String userId) {
        List<BookList> lists = listMapper.selectList(new LambdaQueryWrapper<BookList>()
                .eq(BookList::getUserId, userId));
        if (lists.isEmpty()) {
            return Result.success(Map.of());
        }
        List<Long> listIds = lists.stream().map(BookList::getId).toList();
        List<BookListItem> items = itemMapper.selectList(new LambdaQueryWrapper<BookListItem>()
                .in(BookListItem::getListId, listIds));
        Map<Integer, List<Long>> result = new LinkedHashMap<>();
        for (BookListItem item : items) {
            result.computeIfAbsent(item.getBookId(), key -> new ArrayList<>()).add(item.getListId());
        }
        return Result.success(result);
    }

    private BookList owned(String userId, Long id) {
        if (id == null) return null;
        return listMapper.selectOne(new LambdaQueryWrapper<BookList>()
                .eq(BookList::getId, id)
                .eq(BookList::getUserId, userId));
    }
}
