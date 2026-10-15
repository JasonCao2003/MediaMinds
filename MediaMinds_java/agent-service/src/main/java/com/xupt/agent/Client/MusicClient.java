package com.xupt.agent.Client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

/** 音乐数据源（酷狗接入在 music-service 内） */
@FeignClient(name = "music-service")
public interface MusicClient {

    @GetMapping("/v1/music/kugou/search")
    Map<String, Object> kugouSearch(@RequestParam("keyword") String keyword,
                                    @RequestParam("page") int page,
                                    @RequestParam("size") int size);

    @PostMapping("/v1/music/kugou/import")
    Map<String, Object> kugouImport(@RequestBody Map<String, Object> body);
}
