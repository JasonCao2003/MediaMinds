package com.xupt.gateway.Config;

import com.xupt.gateway.DTO.Result;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration
@Order(-1) // 优先级高于默认异常处理器
public class GlobalExceptionHandler implements ErrorWebExceptionHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        Result<?> result;
        if (ex instanceof IllegalArgumentException) { // 示例：参数校验异常
            response.setStatusCode(HttpStatus.BAD_REQUEST);
            result = Result.error("参数校验失败：" + ex.getMessage());
        } else {
            response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR);
            result = Result.error("服务器内部错误：" + ex.getMessage());
        }

        // 将 Result 序列化为 JSON
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(result);
            return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)));
        } catch (Exception e) {
            return response.setComplete(); // 序列化失败时直接结束
        }
    }
}