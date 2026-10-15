package com.xupt.agent.Client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

/** 影视数据源（TMDB，接入在 video-service 内） */
@FeignClient(name = "video-service")
public interface VideoClient {

    @GetMapping("/v1/video/tmdb/search")
    Map<String, Object> tmdbSearch(@RequestParam("query") String query,
                                   @RequestParam("page") int page);

    @GetMapping("/v1/video/tmdb/person/search")
    Map<String, Object> tmdbPersonSearch(@RequestParam("query") String query,
                                         @RequestParam("page") int page);

    @GetMapping("/v1/video/tmdb/person/movies")
    Map<String, Object> tmdbPersonMovies(@RequestParam("personId") long personId,
                                         @RequestParam("role") String role,
                                         @RequestParam("page") int page);

    @PostMapping("/v1/video/tmdb/import")
    Map<String, Object> tmdbImport(@RequestParam("tmdbId") long tmdbId);
}
