package com.xupt.agent.Config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 把网关下发的用户上下文（X-UserId / X-UserName）透传给下游数据源服务。
 */
@Configuration
public class FeignConfig {

    private static final String[] HEADERS = {"X-UserId", "X-UserName", "Authorization"};

    @Bean
    public RequestInterceptor userContextForwarder() {
        return template -> {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return;
            }
            HttpServletRequest request = attrs.getRequest();
            for (String header : HEADERS) {
                String value = request.getHeader(header);
                if (value != null && !value.isEmpty()) {
                    template.header(header, value);
                }
            }
        };
    }
}
