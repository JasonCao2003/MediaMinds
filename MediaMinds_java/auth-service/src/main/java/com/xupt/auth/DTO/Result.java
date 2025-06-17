package com.xupt.auth.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {
    private Integer code;       // 响应码
    private String message;     // 响应消息
    private T data;             // 响应数据


    // 成功返回 - 带数据
    public static <T> Result<T> success(T data) {
        return new Result<>(200, "操作成功", data);
    }

    // 成功返回 - 登录成功
    public static <T> Result<T> loginSuccess(T data) {
        return new Result<>(200, "登录成功", data);
    }

    // 成功返回 - 不带数据
    public static Result<?> success() {
        return new Result<>(200, "操作成功", null);
    }

    // 失败返回 - 默认错误类型
    public static <T> Result<T> error(String message) {return new Result<>(400, message, null);}

    // 失败返回 - 自定义错误类型
    public static <T> Result<T> error(Integer code, String message) {
        return new Result<>(code, message, null);
    }


    /*
    2xx (成功)：
        200 OK：请求成功。
        201 Created：请求成功并创建了新的资源。
        204 No Content：请求成功，但没有返回内容。

    4xx (客户端错误)：
        400 Bad Request：客户端请求无效，服务器无法理解。
        401 Unauthorized：请求未授权，通常需要登录。
        403 Forbidden：服务器理解请求，但拒绝执行。
        404 Not Found：请求的资源未找到。
        405 Method Not Allowed：请求方法不被允许。
        422 Unprocessable Entity：请求格式正确，但无法处理。

    5xx (服务器错误)：
        500 Internal Server Error：服务器内部错误，无法处理请求。
        502 Bad Gateway：网关错误，通常与代理服务器相关。
        503 Service Unavailable：服务器不可用，可能是过载或维护。
        504 Gateway Timeout：网关超时。
    */
}
