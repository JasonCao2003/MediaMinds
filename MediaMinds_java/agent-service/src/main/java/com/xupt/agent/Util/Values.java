package com.xupt.agent.Util;

import com.xupt.agent.DTO.Candidate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 弱类型 JSON（Map/List）取值工具：下游服务统一返回 {@code Map<String,Object>}，
 * 这里集中处理类型转换与空值兜底。
 */
public final class Values {

    private Values() {
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> asMap(Object o) {
        return o instanceof Map ? (Map<String, Object>) o : Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    public static List<Object> asList(Object o) {
        return o instanceof List ? (List<Object>) o : Collections.emptyList();
    }

    /** 从候选分组里取出候选列表 */
    @SuppressWarnings("unchecked")
    public static List<Candidate> candidatesOf(Map<String, Object> group) {
        Object c = group == null ? null : group.get("candidates");
        return c instanceof List ? (List<Candidate>) c : Collections.emptyList();
    }

    public static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    public static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public static long longOf(Object o) {
        if (o instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(str(o));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    public static Double doubleOf(Object o) {
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(str(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static int intOf(Object o, int fallback) {
        if (o instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(str(o));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
