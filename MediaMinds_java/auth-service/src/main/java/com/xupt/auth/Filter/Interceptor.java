package com.xupt.auth.Filter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import com.xupt.auth.Utils.ThreadLocalUtil;

import java.util.Map;

@Component
public class Interceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull Object handler) throws Exception {
        // 从请求头中获取用户信息
        String userId = request.getHeader("X-UserId");
        String userName = request.getHeader("X-UserName");

        if (userName != null) {
            // 将用户信息存入 ThreadLocal，以便后续处理
            Map<String, Object> claims = Map.of(
                "userId", userId,
                "userName", userName
            );
            ThreadLocalUtil.set(claims);
        }

        return true;
    }

    @Override
    public void afterCompletion(@NotNull HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull Object handler, Exception ex){
        // 清理 ThreadLocal 中的用户信息
        ThreadLocalUtil.remove();
    }
}
