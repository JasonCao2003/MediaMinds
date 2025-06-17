package com.xupt.book.Service;

import com.xupt.book.DTO.RelateDTO;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 基于皮尔逊相关系数的协同过滤推荐算法核心类
 * 优化点：
 * 1. 增强null值处理
 * 2. 改进相似度计算效率
 * 3. 优化数据结构选择
 * 4. 添加防御性编程
 */
@Service
public class CoreMath {

    /**
     * 为指定用户生成推荐列表
     * @param userId 目标用户ID
     * @param list 用户-商品交互数据列表
     * @return 推荐的商品ID列表（按推荐度排序）
     */
    public List<Integer> recommend(String userId, List<RelateDTO> list) {
        // 输入参数校验
        if (userId == null || userId.isBlank() || list == null) {
            return Collections.emptyList();
        }

        // 数据预处理：过滤无效数据
        List<RelateDTO> validList = list.stream()
                .filter(dto -> dto != null
                        && dto.getUserId() != null
                        && dto.getProductId() != null)
                .collect(Collectors.toList());

        if (validList.isEmpty()) {
            return Collections.emptyList();
        }

        // 计算邻近用户
        Map<Double, String> neighborDistances = computeNearestNeighbor(userId, validList);
        if (neighborDistances.isEmpty()) {
            return Collections.emptyList();
        }

        // 获取最相似用户（按相似度降序取第一个）
        Optional<Map.Entry<Double, String>> nearestNeighbor = neighborDistances.entrySet()
                .stream()
                .max(Map.Entry.comparingByKey());

        if (!nearestNeighbor.isPresent()) {
            return Collections.emptyList();
        }

        String nearestUserId = nearestNeighbor.get().getValue();

        // 分组用户数据
        Map<String, Set<Integer>> userProductMap = validList.stream()
                .collect(Collectors.groupingBy(
                        RelateDTO::getUserId,
                        Collectors.mapping(
                                RelateDTO::getProductId,
                                Collectors.toSet()
                        )
                ));

        // 获取目标用户和邻近用户的商品集合
        Set<Integer> userProducts = userProductMap.getOrDefault(userId, Collections.emptySet());
        Set<Integer> neighborProducts = userProductMap.getOrDefault(nearestUserId, Collections.emptySet());

        // 生成推荐列表：邻近用户有但目标用户没有的商品
        return neighborProducts.stream()
                .filter(product -> !userProducts.contains(product))
                .sorted()
                .collect(Collectors.toList());
    }

    /**
     * 计算目标用户与其他用户的相似度
     * @param userId 目标用户ID
     * @param list 有效数据列表
     * @return 相似度到用户ID的映射（按相似度升序排列）
     */
    private Map<Double, String> computeNearestNeighbor(String userId, List<RelateDTO> list) {
        // 按用户分组数据
        Map<String, List<RelateDTO>> userDataMap = list.stream()
                .collect(Collectors.groupingBy(
                        RelateDTO::getUserId,
                        Collectors.toList()
                ));

        List<RelateDTO> targetUserData = userDataMap.getOrDefault(userId, Collections.emptyList());
        if (targetUserData.isEmpty()) {
            return Collections.emptyMap();
        }

        // 使用LinkedHashMap保持插入顺序
        Map<Double, String> distances = new TreeMap<>();

        userDataMap.forEach((otherUserId, otherUserData) -> {
            if (!otherUserId.equals(userId)){
                double similarity = pearsonDis(targetUserData, otherUserData);
                // 相似度范围验证
                if (!Double.isNaN(similarity)){
                    distances.put(similarity, otherUserId);
                }
            }
        });

        return distances;
    }

    /**
     * 计算两个用户之间的皮尔逊相关系数
     * @param xList 用户X的交互数据
     * @param yList 用户Y的交互数据
     * @return 皮尔逊相关系数 [-1, 1]
     */
    private double pearsonDis(List<RelateDTO> xList, List<RelateDTO> yList) {
        // 构建评分映射，过滤null值
        Map<Integer, Integer> xMap = xList.stream()
                .filter(dto -> dto.getProductId() != null)
                .collect(Collectors.toMap(
                        RelateDTO::getProductId,
                        RelateDTO::getIndex,
                        (v1, v2) -> v1 // 如果有重复键，保留第一个值
                ));

        Map<Integer, Integer> yMap = yList.stream()
                .filter(dto -> dto.getProductId() != null)
                .collect(Collectors.toMap(
                        RelateDTO::getProductId,
                        RelateDTO::getIndex,
                        (v1, v2) -> v1
                ));

        // 收集共同评价的商品评分
        List<Integer> commonXs = new ArrayList<>();
        List<Integer> commonYs = new ArrayList<>();

        xMap.forEach((productId, xRating) -> {
            if (yMap.containsKey(productId)) {
                commonXs.add(xRating);
                commonYs.add(yMap.get(productId));
            }
        });

        // 无共同评价商品时返回0
        if (commonXs.isEmpty()) {
            return 0.0;
        }

        return calculatePearson(commonXs, commonYs);
    }

    /**
     * 计算皮尔逊相关系数
     * @param xs 评分列表X
     * @param ys 评分列表Y
     * @return 相关系数
     */
    private static double calculatePearson(List<Integer> xs, List<Integer> ys) {
        int n = xs.size();
        double sumX = 0.0, sumY = 0.0;
        double sumX2 = 0.0, sumY2 = 0.0, sumXY = 0.0;

        for (int i = 0; i < n; i++) {
            int x = xs.get(i);
            int y = ys.get(i);

            sumX += x;
            sumY += y;
            sumX2 += x * x;
            sumY2 += y * y;
            sumXY += x * y;
        }

        double numerator = sumXY - (sumX * sumY / n);
        double denominatorX = sumX2 - (sumX * sumX / n);
        double denominatorY = sumY2 - (sumY * sumY / n);

        if (denominatorX <= 0 || denominatorY <= 0) {
            return 0.0;
        }

        return numerator / Math.sqrt(denominatorX * denominatorY);
    }
}