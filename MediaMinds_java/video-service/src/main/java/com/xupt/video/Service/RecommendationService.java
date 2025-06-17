package com.xupt.video.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xupt.video.DTO.Result;
import com.xupt.video.Mapper.*;
import com.xupt.video.Pojo.*;
import com.xupt.video.Utils.ThreadLocalUtil;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    @Resource
    private RecommendationMapper recommendationMapper;
    
    @Resource
    private MovieMapper movieMapper;
    
    @Resource
    private UserVideoInteractionMapper interactionMapper;
    
    @Resource
    private FavoriteMapper favoriteMapper;
    
    @Resource
    private CommentMapper commentMapper;

    // 获取推荐电影列表
    public Result<Page<Movie>> getRecommendations(int page, int size) {
        try {
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询数据库中是否已有推荐记录
            LambdaQueryWrapper<Recommendation> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Recommendation::getUserId, userId);
            long count = recommendationMapper.selectCount(queryWrapper);
            
            // 如果没有推荐记录，执行协同过滤推荐算法
            if (count == 0) {
                generateRecommendations(userId);
            }
            
            // 分页查询用户的推荐记录
            Page<Recommendation> recommendationPage = new Page<>(page, size);
            queryWrapper.orderByDesc(Recommendation::getScore);
            recommendationMapper.selectPage(recommendationPage, queryWrapper);
            
            List<Recommendation> recommendations = recommendationPage.getRecords();
            if (recommendations.isEmpty()) {
                Page<Movie> emptyPage = new Page<>(page, size);
                return Result.success(emptyPage);
            }
            
            // 获取电影ID列表
            List<Long> movieIds = recommendations.stream()
                    .map(Recommendation::getMovieId)
                    .collect(Collectors.toList());
            
            // 查询电影详情
            LambdaQueryWrapper<Movie> movieQueryWrapper = new LambdaQueryWrapper<>();
            movieQueryWrapper.in(Movie::getId, movieIds);
            List<Movie> movies = movieMapper.selectList(movieQueryWrapper);
            
            // 保持原推荐顺序
            List<Movie> sortedMovies = movieIds.stream()
                    .map(id -> movies.stream()
                            .filter(movie -> movie.getId().equals(id))
                            .findFirst()
                            .orElse(null))
                    .filter(movie -> movie != null)
                    .collect(Collectors.toList());
            
            // 构建结果页
            Page<Movie> resultPage = new Page<>(page, size, recommendationPage.getTotal());
            resultPage.setRecords(sortedMovies);
            
            return Result.success(resultPage);
        } catch (Exception e) {
            return Result.error(500, "获取推荐列表失败: " + e.getMessage());
        }
    }
    
    // 执行协同过滤算法，为用户生成推荐电影
    private void generateRecommendations(String userId) {
        try {
            // 1. 收集所有用户的观影数据，形成用户-电影评分矩阵
            Map<String, Map<Long, Double>> userMovieMatrix = buildUserMovieMatrix();
            
            // 2. 计算目标用户与其他用户的相似度
            Map<String, Double> userSimilarities = computeUserSimilarities(userId, userMovieMatrix);
            
            // 3. 选择最相似的N个用户
            int n = 5; // 选择最相似的5个用户
            List<Map.Entry<String, Double>> nearestNeighbors = userSimilarities.entrySet().stream()
                    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                    .limit(n)
                    .collect(Collectors.toList());
            
            // 如果没有相似用户，跳过推荐过程
            if (nearestNeighbors.isEmpty()) {
                return;
            }
            
            // 4. 根据相似用户的观看记录，计算推荐电影
            Map<Long, Double> recommendedMovies = computeRecommendedMovies(userId, nearestNeighbors, userMovieMatrix);
            
            // 5. 将推荐结果保存到数据库
            saveRecommendations(userId, recommendedMovies);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    // 构建用户-电影评分矩阵
    private Map<String, Map<Long, Double>> buildUserMovieMatrix() {
        Map<String, Map<Long, Double>> userMovieMatrix = new HashMap<>();
        
        // 1. 收集观看记录数据
        List<UserVideoInteraction> interactions = interactionMapper.selectList(null);
        for (UserVideoInteraction interaction : interactions) {
            String userId = interaction.getUserId();
            Long movieId = interaction.getMovieId();
            
            // 基于观看次数和观看进度计算评分
            // 观看次数越多，观看进度越高，评分越高
            double watchScore = interaction.getWatchCount() * interaction.getWatchProgress().doubleValue();
            watchScore = Math.min(watchScore, 5.0); // 限制评分上限
            
            userMovieMatrix.putIfAbsent(userId, new HashMap<>());
            userMovieMatrix.get(userId).put(movieId, watchScore);
        }
        
        // 2. 收集评论评分数据
        List<Comment> comments = commentMapper.selectList(null);
        for (Comment comment : comments) {
            String userId = comment.getUserId();
            Long movieId = comment.getMovieId();
            
            // 用户评分直接作为评分数据
            double rateScore = comment.getRate().doubleValue();
            
            userMovieMatrix.putIfAbsent(userId, new HashMap<>());
            // 评论评分优先级高于观看评分
            userMovieMatrix.get(userId).put(movieId, rateScore);
        }
        
        // 3. 收集收藏数据
        List<Favorite> favorites = favoriteMapper.selectList(null);
        for (Favorite favorite : favorites) {
            String userId = favorite.getUserId();
            Long movieId = favorite.getMovieId();
            
            userMovieMatrix.putIfAbsent(userId, new HashMap<>());
            // 收藏算作高评分
            userMovieMatrix.get(userId).put(movieId, 5.0);
        }
        
        return userMovieMatrix;
    }
    
    // 计算目标用户与其他用户的相似度
    private Map<String, Double> computeUserSimilarities(String targetUserId, Map<String, Map<Long, Double>> userMovieMatrix) {
        Map<String, Double> similarities = new HashMap<>();
        
        // 获取目标用户的评分数据
        Map<Long, Double> targetUserRatings = userMovieMatrix.getOrDefault(targetUserId, new HashMap<>());
        
        // 如果目标用户没有评分数据，返回空结果
        if (targetUserRatings.isEmpty()) {
            return similarities;
        }
        
        // 计算与每个用户的相似度
        for (String otherUserId : userMovieMatrix.keySet()) {
            // 跳过自己
            if (otherUserId.equals(targetUserId)) {
                continue;
            }
            
            // 获取其他用户的评分数据
            Map<Long, Double> otherUserRatings = userMovieMatrix.get(otherUserId);
            
            // 使用皮尔逊相关系数计算用户相似度
            double similarity = calculatePearsonCorrelation(targetUserRatings, otherUserRatings);
            
            // 只考虑正相关
            if (similarity > 0) {
                similarities.put(otherUserId, similarity);
            }
        }
        
        return similarities;
    }
    
    // 计算皮尔逊相关系数
    private double calculatePearsonCorrelation(Map<Long, Double> userARatings, Map<Long, Double> userBRatings) {
        // 找出两个用户共同评分的电影
        Set<Long> commonMovies = userARatings.keySet().stream()
                .filter(userBRatings::containsKey)
                .collect(Collectors.toSet());
        
        // 如果没有共同评分的电影，则相似度为0
        if (commonMovies.size() < 2) {
            return 0;
        }
        
        // 计算评分均值
        double userAMean = commonMovies.stream()
                .mapToDouble(userARatings::get)
                .average()
                .orElse(0);
        
        double userBMean = commonMovies.stream()
                .mapToDouble(userBRatings::get)
                .average()
                .orElse(0);
        
        // 计算皮尔逊相关系数
        double numerator = 0;
        double denominatorA = 0;
        double denominatorB = 0;
        
        for (Long movieId : commonMovies) {
            double userARating = userARatings.get(movieId);
            double userBRating = userBRatings.get(movieId);
            
            double userADiff = userARating - userAMean;
            double userBDiff = userBRating - userBMean;
            
            numerator += userADiff * userBDiff;
            denominatorA += userADiff * userADiff;
            denominatorB += userBDiff * userBDiff;
        }
        
        if (denominatorA == 0 || denominatorB == 0) {
            return 0;
        }
        
        return numerator / (Math.sqrt(denominatorA) * Math.sqrt(denominatorB));
    }
    
    // 计算推荐电影列表
    private Map<Long, Double> computeRecommendedMovies(String userId, List<Map.Entry<String, Double>> similarUsers, 
                                                      Map<String, Map<Long, Double>> userMovieMatrix) {
        // 获取目标用户已经观看/评分/收藏的电影
        Set<Long> userMovies = userMovieMatrix.getOrDefault(userId, new HashMap<>()).keySet();
        
        // 计算推荐分数
        Map<Long, Double> recommendationScores = new HashMap<>();
        Map<Long, Double> similaritySum = new HashMap<>();
        
        // 遍历相似用户
        for (Map.Entry<String, Double> entry : similarUsers) {
            String similarUserId = entry.getKey();
            double similarity = entry.getValue();
            
            // 获取相似用户的评分数据
            Map<Long, Double> similarUserRatings = userMovieMatrix.get(similarUserId);
            
            // 遍历相似用户评分过的电影
            for (Map.Entry<Long, Double> ratingEntry : similarUserRatings.entrySet()) {
                Long movieId = ratingEntry.getKey();
                double rating = ratingEntry.getValue();
                
                // 跳过用户已经观看/评分/收藏的电影
                if (userMovies.contains(movieId)) {
                    continue;
                }
                
                // 累加加权评分
                recommendationScores.putIfAbsent(movieId, 0.0);
                similaritySum.putIfAbsent(movieId, 0.0);
                
                recommendationScores.put(movieId, recommendationScores.get(movieId) + rating * similarity);
                similaritySum.put(movieId, similaritySum.get(movieId) + similarity);
            }
        }
        
        // 计算最终推荐分数
        Map<Long, Double> finalScores = new HashMap<>();
        for (Long movieId : recommendationScores.keySet()) {
            double sumSimilarity = similaritySum.get(movieId);
            if (sumSimilarity > 0) {
                finalScores.put(movieId, recommendationScores.get(movieId) / sumSimilarity);
            }
        }
        
        return finalScores;
    }
    
    // 保存推荐结果到数据库
    private void saveRecommendations(String userId, Map<Long, Double> recommendedMovies) {
        // 对推荐电影按得分排序
        List<Map.Entry<Long, Double>> sortedRecommendations = recommendedMovies.entrySet().stream()
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .limit(20) // 最多保存20部推荐电影
                .collect(Collectors.toList());
        
        // 保存到推荐表
        LocalDateTime now = LocalDateTime.now();
        for (Map.Entry<Long, Double> entry : sortedRecommendations) {
            Long movieId = entry.getKey();
            Double score = entry.getValue();
            
            // 查询电影是否存在
            Movie movie = movieMapper.selectById(movieId);
            if (movie == null) {
                continue;
            }
            
            // 创建推荐记录
            Recommendation recommendation = new Recommendation();
            recommendation.setUserId(userId);
            recommendation.setMovieId(movieId);
            recommendation.setScore(BigDecimal.valueOf(score));
            recommendation.setReason("基于您的观影历史和偏好推荐");
            recommendation.setCreateTime(now);
            recommendation.setStatus((byte) 0); // 未读状态
            
            recommendationMapper.insert(recommendation);
        }
    }

    // 标记推荐已读
    public Result<?> markAsRead(Long recommendationId) {
        try {
            if (recommendationId == null) {
                return Result.error(400, "推荐ID不能为空");
            }
            
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询推荐记录
            Recommendation recommendation = recommendationMapper.selectById(recommendationId);
            if (recommendation == null) {
                return Result.error(404, "推荐记录不存在");
            }
            
            // 验证用户权限
            if (!recommendation.getUserId().equals(userId)) {
                return Result.error(403, "没有权限更新此推荐状态");
            }
            
            // 更新状态
            recommendation.setStatus((byte) 1); // 1表示已读
            recommendationMapper.updateById(recommendation);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "更新推荐状态失败: " + e.getMessage());
        }
    }

    // 获取未读推荐数量
    public Result<Long> getUnreadCount() {
        try {
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 查询未读推荐数量
            LambdaQueryWrapper<Recommendation> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Recommendation::getUserId, userId)
                       .eq(Recommendation::getStatus, 0); // 0表示未读
            long count = recommendationMapper.selectCount(queryWrapper);
            
            return Result.success(count);
        } catch (Exception e) {
            return Result.error(500, "获取未读推荐数量失败: " + e.getMessage());
        }
    }
    
    // 刷新推荐
    public Result<?> refreshRecommendations() {
        try {
            // 从ThreadLocal获取用户ID
            Map<String, Object> claims = ThreadLocalUtil.get();
            String userId = claims.get("userId").toString();
            
            // 删除该用户现有的推荐记录
            LambdaQueryWrapper<Recommendation> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.eq(Recommendation::getUserId, userId);
            recommendationMapper.delete(queryWrapper);
            
            // 重新生成推荐
            generateRecommendations(userId);
            
            return Result.success();
        } catch (Exception e) {
            return Result.error(500, "刷新推荐失败: " + e.getMessage());
        }
    }
} 