package com.xupt.book.file;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 按格式分发到对应的抽取器。
 *
 * <p>Spring 会把所有 {@link BookFileExtractor} 实现注入进来，新增格式只需再写一个
 * {@code @Component}，这里不用改。
 */
@Component
public class BookFileExtractorFactory {

    private final Map<BookFormat, BookFileExtractor> extractors;

    public BookFileExtractorFactory(List<BookFileExtractor> extractorList) {
        Map<BookFormat, BookFileExtractor> map = new EnumMap<>(BookFormat.class);
        for (BookFileExtractor extractor : extractorList) {
            map.put(extractor.format(), extractor);
        }
        this.extractors = map;
    }

    /** 该格式是否有抽取器；没有说明暂不支持入库 */
    public boolean supports(BookFormat format) {
        return format != null && extractors.containsKey(format);
    }

    /** 取抽取器；不支持时抛异常 */
    public BookFileExtractor get(BookFormat format) {
        BookFileExtractor extractor = extractors.get(format);
        if (extractor == null) {
            throw new IllegalArgumentException("暂不支持的图书格式: " + format);
        }
        return extractor;
    }

    /** 支持入库的格式列表，给前端做上传前的校验提示 */
    public List<BookFormat> supportedFormats() {
        return List.copyOf(extractors.keySet());
    }
}
