package com.xupt.book.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.book.DTO.Result;

import com.xupt.book.Mapper.BookFavoriteMapper;
import com.xupt.book.Mapper.BookMapper;
import com.xupt.book.Mapper.BookTypeMapper;
import com.xupt.book.Pojo.BookFavorite;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Pojo.BookType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BookTypeService {

    @Autowired
    private BookTypeMapper bookTypeMapper;

    @Autowired
    private BookMapper bookMapper;

    @Autowired
    private BookFavoriteMapper bookFavoriteMapper;

    // 分页查询类型管理列表
    public Result<Page<BookType>> getTypeList(int page, int size) {
        try {
            Page<BookType> pageInfo = new Page<>(page, size);
            LambdaQueryWrapper<BookType> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByAsc(BookType::getTypeName);
            bookTypeMapper.selectPage(pageInfo, queryWrapper);
            return Result.success(pageInfo);
        } catch (Exception e) {
            return Result.error(500, "查询类型列表失败: " + e.getMessage());
        }
    }

    // 查询所有类型管理列表
    public Result<List<BookType>> getAllTypes() {
        try {
            LambdaQueryWrapper<BookType> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.orderByAsc(BookType::getTypeName);
            List<BookType> types = bookTypeMapper.selectList(queryWrapper);
            return Result.success(types);
        } catch (Exception e) {
            return Result.error(500, "查询所有类型失败: " + e.getMessage());
        }
    }

    // 获取类型管理详细信息
    public Result<BookType> getTypeById(Integer id) {
        try {
            BookType type = bookTypeMapper.selectById(id);
            if (type == null) {
                return Result.error(404, "类型不存在");
            }
            return Result.success(type);
        } catch (Exception e) {
            return Result.error(500, "查询类型详情失败: " + e.getMessage());
        }
    }

    // 新增类型管理
    public Result<?> addType(BookType type) {
        try {
            if (type.getTypeName() == null || type.getTypeName().trim().isEmpty()) {
                return Result.error(400, "类型名称不能为空");
            }
            LambdaQueryWrapper<BookType> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(BookType::getTypeName, type.getTypeName());
            if (bookTypeMapper.selectCount(queryWrapper) > 0) {
                return Result.error(400, "类型名称已存在");
            }
            type.setCreateTime(LocalDateTime.now());
            type.setUpdateTime(LocalDateTime.now());
            bookTypeMapper.insert(type);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "新增类型失败: " + e.getMessage());
        }
    }

    // 修改类型管理
    public Result<?> updateType(BookType type) {
        try {
            if (type.getId() == null) {
                return Result.error(400, "类型ID不能为空");
            }
            BookType existingType = bookTypeMapper.selectById(type.getId());
            if (existingType == null) {
                return Result.error(404, "类型不存在");
            }
            if (type.getTypeName() != null && !type.getTypeName().trim().isEmpty()) {
                LambdaQueryWrapper<BookType> queryWrapper = new LambdaQueryWrapper<>();
                queryWrapper.eq(BookType::getTypeName, type.getTypeName())
                        .ne(BookType::getId, type.getId());
                if (bookTypeMapper.selectCount(queryWrapper) > 0) {
                    return Result.error(400, "类型名称已存在");
                }
            }
            type.setUpdateTime(LocalDateTime.now());
            bookTypeMapper.updateById(type);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "修改类型失败: " + e.getMessage());
        }
    }

    // 删除类型管理
    public Result<?> deleteType(Integer id) {
        try {
            BookType type = bookTypeMapper.selectById(id);
            if (type == null) {
                return Result.error(404, "类型不存在");
            }
            LambdaQueryWrapper<Book> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Book::getTypeId, id);
            if (bookMapper.selectCount(queryWrapper) > 0) {
                return Result.error(400, "该类型下存在书籍，无法删除");
            }
            bookTypeMapper.deleteById(id);
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "删除类型失败: " + e.getMessage());
        }
    }

    // 推荐书籍 - 基于皮尔逊相关系数的协同过滤算法
    public Result<List<Book>> recommendBooks(String userId) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return Result.error(400, "用户ID不能为空");
            }

            // 获取用户收藏的书籍
            LambdaQueryWrapper<BookFavorite> favoriteWrapper = new LambdaQueryWrapper<>();
            favoriteWrapper.eq(BookFavorite::getUserId, userId);
            List<BookFavorite> userFavorites = bookFavoriteMapper.selectList(favoriteWrapper);
            if (userFavorites.isEmpty()) {
                return getPopularBooks();
            }
            List<Integer> userFavoriteBookIds = userFavorites.stream()
                    .map(BookFavorite::getBookId)
                    .toList();

            // 获取所有收藏记录
            List<BookFavorite> allFavorites = bookFavoriteMapper.selectList(null);
            Map<Integer, List<String>> bookToUsers = allFavorites.stream()
                    .collect(Collectors.groupingBy(
                            BookFavorite::getBookId,
                            Collectors.mapping(BookFavorite::getUserId, Collectors.toList())
                    ));

            // 计算皮尔逊相关系数
            Map<Integer, Double> similarityScores = new HashMap<>();
            for (Integer targetBookId : bookToUsers.keySet()) {
                // 跳过用户已收藏的书籍
                if (userFavoriteBookIds.contains(targetBookId)) {
                    continue;
                }
                
                // 计算与用户收藏书籍的相似度
                double maxSimilarity = -1.0;
                for (Integer userBookId : userFavoriteBookIds) {
                    double similarity = calculatePearsonCorrelation(userBookId, targetBookId, bookToUsers);
                    if (similarity > maxSimilarity) {
                        maxSimilarity = similarity;
                    }
                }
                
                // 只考虑正相关且相似度大于0.3的书籍
                if (maxSimilarity > 0.3) {
                    similarityScores.put(targetBookId, maxSimilarity);
                }
            }

            // 按相似度排序并获取前10本书
            List<Integer> recommendedBookIds = similarityScores.entrySet().stream()
                    .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                    .limit(10)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            // 如果推荐列表为空，返回热门书籍
            if (recommendedBookIds.isEmpty()) {
                return getPopularBooks();
            }

            // 获取推荐书籍详情，排除用户已收藏的书籍
            LambdaQueryWrapper<Book> bookWrapper = new LambdaQueryWrapper<>();
            bookWrapper.in(Book::getId, recommendedBookIds)
                    .notIn(Book::getId, userFavoriteBookIds)  // 确保不包含用户已收藏的书籍
                    .orderByDesc(Book::getChapterCount)
                    .last("LIMIT 10");
            List<Book> recommendedBooks = bookMapper.selectList(bookWrapper);

            return Result.success(recommendedBooks);
        } catch (Exception e) {
            return Result.error(500, "推荐书籍失败: " + e.getMessage());
        }
    }

    // 计算两个书籍之间的皮尔逊相关系数
    private double calculatePearsonCorrelation(Integer bookId1, Integer bookId2, Map<Integer, List<String>> bookToUsers) {
        List<String> users1 = bookToUsers.getOrDefault(bookId1, new ArrayList<>());
        List<String> users2 = bookToUsers.getOrDefault(bookId2, new ArrayList<>());

        // 找到共同收藏两个书籍的用户
        List<String> commonUsers = users1.stream()
                .filter(users2::contains)
                .toList();
        if (commonUsers.size() < 2) { // 需要至少2个共同用户
            return -1.0;
        }

        // 构建评分向量（1表示收藏，0表示未收藏）
        double[] ratings1 = new double[commonUsers.size()];
        double[] ratings2 = new double[commonUsers.size()];
        for (int i = 0; i < commonUsers.size(); i++) {
            ratings1[i] = 1.0; // 共同用户都收藏了bookId1
            ratings2[i] = 1.0; // 共同用户都收藏了bookId2
        }

        // 计算皮尔逊相关系数
        double mean1 = Arrays.stream(ratings1).average().orElse(0.0);
        double mean2 = Arrays.stream(ratings2).average().orElse(0.0);

        double numerator = 0.0;
        double denominator1 = 0.0;
        double denominator2 = 0.0;
        for (int i = 0; i < ratings1.length; i++) {
            double diff1 = ratings1[i] - mean1;
            double diff2 = ratings2[i] - mean2;
            numerator += diff1 * diff2;
            denominator1 += diff1 * diff1;
            denominator2 += diff2 * diff2;
        }

        if (denominator1 == 0 || denominator2 == 0) {
            return -1.0;
        }

        return numerator / Math.sqrt(denominator1 * denominator2);
    }

    // 获取热门书籍（作为无收藏或无推荐时的备选）
    private Result<List<Book>> getPopularBooks() {
        LambdaQueryWrapper<BookFavorite> favoriteWrapper = new LambdaQueryWrapper<>();
        List<BookFavorite> allFavorites = bookFavoriteMapper.selectList(favoriteWrapper);
        Map<Integer, Long> bookCount = allFavorites.stream()
                .collect(Collectors.groupingBy(BookFavorite::getBookId, Collectors.counting()));
        List<Integer> topBookIds = bookCount.entrySet().stream()
                .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                .limit(10)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        LambdaQueryWrapper<Book> bookWrapper = new LambdaQueryWrapper<>();
        bookWrapper.in(Book::getId, topBookIds.isEmpty() ? new ArrayList<>() : topBookIds)
                .orderByDesc(Book::getChapterCount)
                .last("LIMIT 10");
        List<Book> popularBooks = bookMapper.selectList(bookWrapper);
        return Result.success(popularBooks);
    }
}