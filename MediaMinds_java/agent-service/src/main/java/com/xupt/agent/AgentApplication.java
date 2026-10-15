package com.xupt.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * MediaMinds 智能入库 Agent
 *
 * 面向用户的自然语言入口：理解「我想要某个视频/图书/音乐」这类意图，
 * 聚合调用酷狗 / TMDB / Gutenberg 三个数据源，结构化候选结果，
 * 用户选择后再把元信息批量入库（媒体本体不入库，用户可自行上传）。
 */
@SpringBootApplication
@EnableFeignClients
public class AgentApplication {

    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
    }
}
