package com.xupt.spark.service;

import com.xupt.spark.utils.SparkUtil;
import jakarta.annotation.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 讯飞星火大模型服务类
 */
@Service
public class SparkService {
    private static final Logger logger = LoggerFactory.getLogger(SparkService.class);
    
    @Resource
    private SparkUtil sparkUtil;
    
    /**
     * 处理多行文本，确保换行符能够正确处理
     * 
     * @param content 原始内容
     * @return 处理后的内容
     */
    public String handleMultilineText(String content) {
        if (content == null || content.isEmpty()) {
            return "";
        }
        try {
            // 进行预处理
            content = preprocessContent(content);
            return content;
        } catch (Exception e) {
            logger.error("处理多行文本失败: {}", e.getMessage(), e);
            // 如果处理失败，尝试进行基本清理
            return content.replace("\r", "").trim();
        }
    }
    
    /**
     * 预处理内容，规范化换行符和空格
     *
     * @param content 原始内容
     * @return 处理后的内容
     */
    private String preprocessContent(String content) {
        if (content == null || content.isEmpty()) {
            return content;
        }
        
        try {
            // 规范化换行符，将所有换行符转换为\n
            content = content.replace("\r\n", "\n").replace("\r", "\n");
            
            // 将连续3个以上的换行符替换为2个换行符
            content = content.replaceAll("\\n{3,}", "\n\n");
            
            // 将连续的空格替换为单个空格
            content = content.replaceAll("\\s{2,}", " ");
            
            // 移除文本开头和结尾的空白字符
            content = content.trim();
            
            logger.debug("预处理后的内容长度: {}", content.length());
        } catch (Exception e) {
            logger.error("文本预处理失败，将返回原始内容: {}", e.getMessage());
            // 如果处理失败，返回原始内容，避免空指针异常
        }
        
        return content;
    }
    
    /**
     * 发送聊天消息并获取响应
     *
     * @param userId   用户ID
     * @param content  消息内容
     * @return 解析后的响应结果
     */
    public String chat(String userId, String content) {
        // 预处理内容
        content = handleMultilineText(content);
        
        // 发送消息
        String response = sparkUtil.sendMessage(userId, content);
        
        // 解析响应
        return sparkUtil.parseStreamResponse(response);
    }
    
    /**
     * 获取小说文章概要
     *
     * @param userId  用户ID
     * @param novelContent 小说正文内容
     * @return 小说概要分析结果
     */
    public String getNovelSummary(String userId, String novelContent) {
        // 预处理内容
        novelContent = handleMultilineText(novelContent);
        
        String prompt = "你是一位专业的文学分析师，请对以下小说内容进行详细分析，并以结构化的方式提供以下信息：\n\n" +
                "1. 内容概要（300字以内）：简明扼要地概括小说的主要内容。\n" +
                "2. 主要人物分析：\n" +
                "请确保分析客观、专业，并基于文本内容给出有依据的解读。\n\n" +
                "小说内容：\n" + novelContent;
        
        // 发送消息
        String response = sparkUtil.sendMessage(userId, prompt);
        System.out.println(response);
        // 解析响应
        return sparkUtil.parseStreamResponse(response);
    }
    
    /**
     * 获取歌词情感及分析
     *
     * @param userId  用户ID
     * @param lyricsContent 歌词内容
     * @return 歌词分析结果
     */
    public String getLyricsAnalysis(String userId, String lyricsContent) {
        // 预处理内容
        lyricsContent = handleMultilineText(lyricsContent);
        
        String prompt = "你是一位专业的音乐评论家和歌词分析师，请对以下歌词进行全面、深入的分析，并以结构化的方式提供以下信息：\n\n" +
                "1. 情感基调分析：\n" +
                "   - 整体情感色彩（如：悲伤、欢快、怀旧、愤怒等）\n" +
                "   - 情感变化和发展轨迹\n" +
                "   - 情感表达的强度和真实性\n" +
                "2. 主题与意象分析：\n" +
                "   - 核心主题和副主题\n" +
                "   - 关键意象和符号的运用\n" +
                "   - 意象之间的关联和对比\n" +
                "3. 修辞与技巧分析：\n" +
                "   - 使用的主要修辞手法（如：比喻、拟人、夸张等）\n" +
                "   - 韵律和节奏特点\n" +
                "   - 词语选择和语言风格\n" +
                "4. 深层含义解读：\n" +
                "   - 可能的隐喻和象征意义\n" +
                "   - 社会文化背景的反映\n" +
                "   - 对人性或生活的思考\n" +
                "5. 艺术价值评估：\n" +
                "   - 歌词的原创性和独特性\n" +
                "   - 与音乐结合的契合度\n" +
                "   - 整体艺术成就\n\n" +
                "请确保分析专业、客观，并基于歌词文本给出有依据的解读。避免过度解读或主观臆断。\n\n" +
                "歌词内容：\n" + lyricsContent;
        
        // 发送消息
        String response = sparkUtil.sendMessage(userId, prompt);
        
        // 解析响应
        return sparkUtil.parseStreamResponse(response);
    }
} 