package com.xupt.gateway.Config;

import com.xupt.gateway.Utils.JwtUtil;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
public class JWTFilter implements GlobalFilter, Ordered {

    // 精确放行路径列表
    private static final List<String> EXCLUDED_PATHS = Arrays.asList(
            "/v1/auth/login/accountLogin",
            "/v1/auth/login/emailLogin",
            "/v1/auth/login/faceLogin",
            "/v1/auth/login/sendValidation",
            "/v1/auth/user/register"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().toString();
        HttpMethod method = exchange.getRequest().getMethod();
        // 放行OPTIONS请求和公开端点
        if (method == HttpMethod.OPTIONS || isExcludedPath(path)) {
            return chain.filter(exchange);
        }
        
        // 获取并验证Token
        String token = extractToken(exchange.getRequest());
        try {
            Map<String, Object> claims = JwtUtil.parseToken(token);
            // 将用户信息传递到请求头中，供下游服务使用
            ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                    .header("X-UserId", (String) claims.get("userId"))
                    .header("X-UserName", (String) claims.get("userName"))
                    .header("X-Role", (String) claims.get("role"))
                    .build();
            return chain.filter(exchange.mutate().request(modifiedRequest).build());
        } catch (Exception e) {
            return unauthorizedResponse(exchange, "Invalid token: " + e.getMessage());
        }
    }

    private String extractToken(ServerHttpRequest request) {
        String header = request.getHeaders().getFirst("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return header;
    }

    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        byte[] bytes = ("{\"code\":401,\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    private boolean isExcludedPath(String path) {
        return EXCLUDED_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 1; // 在负载均衡之后执行
    }
}
