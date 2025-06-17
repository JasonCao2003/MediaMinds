package com.xupt.spark.common;

import lombok.Data;

/**
 * 统一返回结果类
 * @param <T> 返回数据类型
 */
@Data
public class Result<T> {
    /**
     * 状态码
     */
    private Integer code;
    
    /**
     * 返回消息
     */
    private String message;
    
    /**
     * 返回数据
     */
    private T data;
    
    /**
     * 私有构造方法
     */
    private Result() {}
    
    /**
     * 成功返回结果
     * @param data 返回数据
     * @param <T> 数据类型
     * @return 统一返回结果
     */
    public static <T> Result<T> success(T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("操作成功");
        result.setData(data);
        return result;
    }
    
    /**
     * 成功返回结果
     * @param message 提示信息
     * @param data 返回数据
     * @param <T> 数据类型
     * @return 统一返回结果
     */
    public static <T> Result<T> success(String message, T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage(message);
        result.setData(data);
        return result;
    }
    
    /**
     * 失败返回结果
     * @param code 状态码
     * @param message 提示信息
     * @param <T> 数据类型
     * @return 统一返回结果
     */
    public static <T> Result<T> fail(Integer code, String message) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }
    
    /**
     * 失败返回结果
     * @param message 提示信息
     * @param <T> 数据类型
     * @return 统一返回结果
     */
    public static <T> Result<T> fail(String message) {
        return fail(500, message);
    }
} 