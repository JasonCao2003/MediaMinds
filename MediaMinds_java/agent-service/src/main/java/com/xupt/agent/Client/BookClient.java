package com.xupt.agent.Client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

/** 图书数据源（豆瓣，接入在 book-service 内） */
@FeignClient(name = "book-service")
public interface BookClient {

    @GetMapping("/v1/book/douban/search")
    Map<String, Object> doubanSearch(@RequestParam("query") String query,
                                     @RequestParam("page") int page);

    @PostMapping("/v1/book/douban/import")
    Map<String, Object> doubanImport(@RequestParam("id") long id);

    @PostMapping("/v1/book/favorite")
    Map<String, Object> addFavorite(@RequestBody Map<String, Object> body);
}
