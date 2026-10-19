package com.xupt.book.file.extractor;

import com.xupt.book.file.BookFileExtractor;
import com.xupt.book.file.BookFormat;
import com.xupt.book.file.CoverImage;
import com.xupt.book.file.ExtractSupport;
import com.xupt.book.file.ExtractedMetadata;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipFile;

/**
 * EPUB 元数据抽取。
 *
 * <p>不引第三方 EPUB 库——EPUB 就是个 ZIP + XML，用 JDK 自带的
 * {@link java.util.zip.ZipFile} 加 DOM 解析即可，少一个依赖也少一份维护面。
 *
 * <p>流程：{@code META-INF/container.xml} → 找到 OPF → 解析 metadata / manifest / spine。
 */
@Component
public class EpubExtractor implements BookFileExtractor {

    private static final String CONTAINER_PATH = "META-INF/container.xml";

    @Override
    public BookFormat format() {
        return BookFormat.EPUB;
    }

    @Override
    public ExtractedMetadata extract(Path file) throws Exception {
        try (ZipFile zip = new ZipFile(file.toFile())) {
            Opf opf = loadOpf(zip);
            ExtractedMetadata meta = new ExtractedMetadata();
            if (opf == null) {
                meta.note("未找到 OPF 包描述文件，无法抽取元数据");
                return meta;
            }
            Document doc = opf.document();

            meta.setBookName(firstNonBlank(
                    ExtractSupport.firstText(doc, "title"),
                    fileNameTitle(file)));

            meta.setBookAuthor(joinCreators(doc));
            meta.setPublisher(ExtractSupport.firstText(doc, "publisher"));
            meta.setPublishedDate(ExtractSupport.normalizeDate(ExtractSupport.firstText(doc, "date")));
            meta.setBookDetails(ExtractSupport.stripHtml(ExtractSupport.firstText(doc, "description")));
            meta.setLanguage(ExtractSupport.firstText(doc, "language"));

            String[] isbn = ExtractSupport.splitIsbn(firstIdentifier(doc));
            meta.setIsbn13(isbn[0]);
            meta.setIsbn10(isbn[1]);
            if (isbn[0] == null && isbn[1] == null) {
                meta.note("未找到 ISBN");
            }

            // 系列：EPUB3 用 belongs-to-collection，calibre 用 calibre:series
            meta.setSeriesName(firstNonBlank(metaValue(doc, "belongs-to-collection"), metaValue(doc, "calibre:series")));
            meta.setSeriesNumber(firstNonBlank(metaValue(doc, "calibre:series_index"), null));

            // spine 条目数当章节数
            meta.setChapterCount(opf.spineCount());

            String coverPath = resolveCoverPath(opf);
            meta.setHasCover(coverPath != null && ExtractSupport.readEntry(zip, coverPath) != null);
            if (!meta.isHasCover()) {
                meta.note("未找到封面，可稍后手工上传或从在线源补全");
            }
            return meta;
        }
    }

    @Override
    public CoverImage extractCover(Path file) throws Exception {
        try (ZipFile zip = new ZipFile(file.toFile())) {
            Opf opf = loadOpf(zip);
            if (opf == null) {
                return null;
            }
            String coverPath = resolveCoverPath(opf);
            if (coverPath == null) {
                return null;
            }
            byte[] data = ExtractSupport.readEntry(zip, coverPath);
            if (data == null || data.length == 0) {
                return null;
            }
            return new CoverImage(data, ExtractSupport.mimeFromName(coverPath),
                    ExtractSupport.extensionFromName(coverPath));
        }
    }

    // ============================================================
    // OPF 解析
    // ============================================================

    /** 定位并解析 OPF：container.xml → rootfile full-path */
    private Opf loadOpf(ZipFile zip) throws Exception {
        byte[] container = ExtractSupport.readEntry(zip, CONTAINER_PATH);
        if (container == null) {
            return null;
        }
        Document containerDoc = ExtractSupport.parseXml(container);
        String opfPath = null;
        for (Element rootfile : ExtractSupport.byLocalName(containerDoc, "rootfile")) {
            String fullPath = rootfile.getAttribute("full-path");
            if (fullPath != null && !fullPath.isBlank()) {
                opfPath = fullPath.trim();
                break;
            }
        }
        if (opfPath == null) {
            return null;
        }
        byte[] opfBytes = ExtractSupport.readEntry(zip, opfPath);
        if (opfBytes == null) {
            return null;
        }
        return new Opf(ExtractSupport.parseXml(opfBytes), ExtractSupport.dirOf(opfPath));
    }

    /**
     * 找封面在 ZIP 里的路径。三种声明方式依次尝试：
     *
     * <ol>
     *   <li>EPUB2：{@code <meta name="cover" content="itemId"/>}</li>
     *   <li>EPUB3：manifest 项的 {@code properties="cover-image"}</li>
     *   <li>兜底：id 或 href 里含 "cover" 的图片项</li>
     * </ol>
     */
    private String resolveCoverPath(Opf opf) {
        Document doc = opf.document();
        Map<String, String> hrefById = new LinkedHashMap<>();
        List<Element> items = ExtractSupport.byLocalName(doc, "item");
        for (Element item : items) {
            String id = item.getAttribute("id");
            String href = item.getAttribute("href");
            if (id != null && !id.isBlank() && href != null && !href.isBlank()) {
                hrefById.put(id, ExtractSupport.resolve(opf.dir(), href));
            }
        }

        // ① EPUB2 的 <meta name="cover">
        for (Element meta : ExtractSupport.byLocalName(doc, "meta")) {
            if ("cover".equalsIgnoreCase(meta.getAttribute("name"))) {
                String id = meta.getAttribute("content");
                String path = hrefById.get(id);
                if (path != null) {
                    return path;
                }
            }
        }

        // ② EPUB3 的 properties="cover-image"
        for (Element item : items) {
            String properties = item.getAttribute("properties");
            if (properties != null && properties.toLowerCase().contains("cover-image")) {
                String href = item.getAttribute("href");
                if (href != null && !href.isBlank()) {
                    return ExtractSupport.resolve(opf.dir(), href);
                }
            }
        }

        // ③ 兜底
        for (Element item : items) {
            String mediaType = item.getAttribute("media-type");
            String id = item.getAttribute("id");
            String href = item.getAttribute("href");
            if (mediaType == null || !mediaType.startsWith("image/") || href == null) {
                continue;
            }
            String lowerId = id == null ? "" : id.toLowerCase();
            String lowerHref = href.toLowerCase();
            if (lowerId.contains("cover") || lowerHref.contains("cover")) {
                return ExtractSupport.resolve(opf.dir(), href);
            }
        }
        return null;
    }

    /** dc:creator 可能有多个（多作者），用逗号连接 */
    private String joinCreators(Document doc) {
        List<String> creators = new ArrayList<>();
        for (Element creator : ExtractSupport.byLocalName(doc, "creator")) {
            String text = ExtractSupport.text(creator);
            if (text != null && !creators.contains(text)) {
                creators.add(text);
            }
        }
        return creators.isEmpty() ? null : String.join(", ", creators);
    }

    private String firstIdentifier(Document doc) {
        List<Element> identifiers = ExtractSupport.byLocalName(doc, "identifier");
        String fallback = null;
        for (Element element : identifiers) {
            String text = ExtractSupport.text(element);
            if (text == null) {
                continue;
            }
            if (fallback == null) {
                fallback = text;
            }
            String lower = text.toLowerCase();
            if (lower.contains("isbn")) {
                return text;
            }
        }
        return fallback;
    }

    /** 取 &lt;meta name="X" content="Y"/&gt; 的 Y；也兼容 EPUB3 的 property/content 写法 */
    private String metaValue(Document doc, String name) {
        for (Element meta : ExtractSupport.byLocalName(doc, "meta")) {
            String declared = meta.getAttribute("name");
            if (declared == null || declared.isBlank()) {
                declared = meta.getAttribute("property");
            }
            if (name.equalsIgnoreCase(declared)) {
                String content = meta.getAttribute("content");
                if (content == null || content.isBlank()) {
                    content = ExtractSupport.text(meta);
                }
                if (content != null && !content.isBlank()) {
                    return content.trim();
                }
            }
        }
        return null;
    }

    private String fileNameTitle(Path file) {
        String name = file.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    /** 解析出来的 OPF：文档 + 它所在的目录（manifest 里的 href 相对它解析） */
    private record Opf(Document document, String dir) {

        int spineCount() {
            int count = 0;
            for (Element itemref : ExtractSupport.byLocalName(document, "itemref")) {
                if (itemref.getAttribute("idref") != null && !itemref.getAttribute("idref").isBlank()) {
                    count++;
                }
            }
            return count;
        }
    }
}
