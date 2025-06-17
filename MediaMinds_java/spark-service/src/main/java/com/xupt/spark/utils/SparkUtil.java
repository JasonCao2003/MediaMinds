package com.xupt.spark.utils;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.xupt.spark.Config.SparkConfig;
import jakarta.annotation.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.function.Consumer;

/**
 * 讯飞星火大模型客户端工具类
 */
@Component
public class SparkUtil {
    private static final Logger logger = LoggerFactory.getLogger(SparkUtil.class);

    @Resource
    private SparkConfig config;

    /**
     * 发送消息到讯飞星火大模型
     *
     * @param userId   用户ID
     * @param content  消息内容
     * @return 响应结果
     */
    public String sendMessage(String userId, String content) {
        return sendMessage(userId, content, null);
    }

    /**
     * 发送消息到讯飞星火大模型，支持流式响应处理
     *
     * @param userId   用户ID
     * @param content  消息内容
     * @param callback 流式响应回调函数
     * @return 响应结果
     */
    public String sendMessage(String userId, String content, Consumer<String> callback) {
        StringBuilder response = new StringBuilder();
        try {
            // 创建最外层的JSON对象
            JSONObject jsonObject = new JSONObject();
            jsonObject.set("user", userId);
            jsonObject.set("model", config.getModel());
            
            // 创建messages数组
            JSONArray messagesArray = new JSONArray();
            
            // 创建单个消息的JSON对象
            JSONObject messageObject = new JSONObject();
            logger.info("发送消息: {}", content.length() > 100 ? content.substring(0, 100) + "..." : content);
            messageObject.set("role", "user");
            messageObject.set("content", content);
            messageObject.set("temperature", config.getTemperature().toString());
            
            // 将单个消息对象添加到messages数组中
            messagesArray.add(messageObject);
            
            // 将messages数组添加到最外层的JSON对象中
            jsonObject.set("messages", messagesArray);
            
            // 设置stream属性
            jsonObject.set("stream", config.getStream());
            jsonObject.set("max_tokens", config.getMaxTokens());

            String header = "Bearer " + config.getApiPassword();

            URL obj = new URL(config.getApiUrl());
            HttpURLConnection con = (HttpURLConnection) obj.openConnection();
            con.setRequestMethod("POST");
            con.setRequestProperty("Content-Type", "application/json");
            con.setRequestProperty("Authorization", header);
            con.setDoOutput(true);

            OutputStream os = con.getOutputStream();
            os.write(jsonObject.toString().getBytes());
            os.flush();
            os.close();

            int responseCode = con.getResponseCode();
            logger.info("响应状态码: {}", responseCode);

            BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
            String inputLine;

            while ((inputLine = in.readLine()) != null) {
                response.append(inputLine);
                
                // 如果有回调函数，则调用
                if (callback != null) {
                    callback.accept(inputLine);
                } else {
                    logger.debug("接收到响应: {}", inputLine);
                }
            }
            in.close();
            
            // 处理流式返回结果
            if (config.getStream() && response.length() > 5) {
                String jsonStr = response.substring(5);
                if (!jsonStr.isEmpty()) {
                    logger.debug("处理后的响应: {}", jsonStr);
                }
            }
        } catch (Exception e) {
            logger.error("发送消息失败", e);
        }
        return response.toString();
    }
    
    /**
     * 处理流式响应，提取有效内容
     * 
     * @param streamResponse 流式响应字符串
     * @return 处理后的结构化内容
     */
    public String parseStreamResponse(String streamResponse) {
        if (streamResponse == null || streamResponse.isEmpty()) {
            return "";
        }
        
        logger.info("开始处理流式响应...");
        
        StringBuilder result = new StringBuilder();
        String[] chunks = streamResponse.split("data: ");
        
        for (String chunk : chunks) {
            if (chunk.isEmpty() || chunk.equals("[DONE]")) {
                continue;
            }
            
            try {
                // 解析JSON
                JSONObject jsonObject = JSONUtil.parseObj(chunk);
                
                // 检查是否有choices数组
                if (jsonObject.containsKey("choices")) {
                    JSONArray choices = jsonObject.getJSONArray("choices");
                    if (!choices.isEmpty()) {
                        JSONObject choice = choices.getJSONObject(0);
                        if (choice.containsKey("delta")) {
                            JSONObject delta = choice.getJSONObject("delta");
                            
                            // 提取content或reasoning_content
                            String content = delta.getStr("content", "");
                            if (content.isEmpty()) {
                                content = delta.getStr("reasoning_content", "");
                            }
                            
                            if (!content.isEmpty()) {
                                result.append(content);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("解析流式响应块失败: {}", chunk, e);
            }
        }
        
        logger.info("流式响应处理完成，内容长度: {}", result.length());
        return result.toString();
    }
} 