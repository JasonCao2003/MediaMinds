package com.xupt.book.file;

import com.xupt.book.Pojo.Book;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipFile;

/**
 * 上传图书文件的**阅读**侧支持（阶段 R）。
 *
 * <p>方案 A：服务端解包 + 按资源服务——EPUB / CBZ 都是 ZIP，先在本地缓存一份
 * （{@link BookFileService#ensureCached}），再用 {@link ZipFile} 随机读单个 entry，
 * 不必每次请求都把整本书拉一遍，也不把原文件交给浏览器端库。
 *
 * <p>EPUB 走 OPF 的 spine 顺序出章节列表；CBZ 复用抽取器的自然页序。
 */
@Slf4j
@Service
public class BookFileReaderService {

    private static final String CONTAINER_PATH = "META-INF/container.xml";

    /** 章节标题直接从 XHTML 的 &lt;title&gt; 里取，长度有限制，不必整篇读进来做 DOM */
    private static final Pattern TITLE_PATTERN =
            Pattern.compile("(?is)<title[^>]*>(.*?)</title>");

    /** 单本书最多解析这么多 spine 条目，避免异常 EPUB 撑爆内存 */
    private static final int MAX_CHAPTERS = 2000;

    private final BookFileService bookFileService;

    public BookFileReaderService(BookFileService bookFileService) {
        this.bookFileService = bookFileService;
    }

    // ============================================================
    // EPUB
    // ============================================================

    /** EPUB 目录：spine 顺序的章节列表（path 是 ZIP 内的 entry 名，前端据此取资源） */
    public Map<String, Object> epubManifest(Book book) throws Exception {
        Path cached = bookFileService.ensureCached(book);
        try (ZipFile zip = new ZipFile(cached.toFile())) {
            Opf opf = loadOpf(zip);
            List<Map<String, Object>> chapters = new ArrayList<>();

            Map<String, String> tocTitles = Map.of();
            if (opf != null) {
                Document doc = opf.document();
                tocTitles = readTocTitles(zip, doc, opf.dir());
                Map<String, String[]> itemById = new LinkedHashMap<>();
                for (Element item : ExtractSupport.byLocalName(doc, "item")) {
                    String id = item.getAttribute("id");
                    String href = item.getAttribute("href");
                    if (id == null || id.isBlank() || href == null || href.isBlank()) {
                        continue;
                    }
                    itemById.put(id, new String[]{
                            ExtractSupport.resolve(opf.dir(), href),
                            item.getAttribute("media-type")
                    });
                }

                for (Element itemref : ExtractSupport.byLocalName(doc, "itemref")) {
                    String idref = itemref.getAttribute("idref");
                    if (idref == null || idref.isBlank()) {
                        continue;
                    }
                    String[] item = itemById.get(idref);
                    if (item == null || item[0] == null) {
                        continue;
                    }
                    if (!isDocument(item[0], item[1])) {
                        continue;
                    }
                    chapters.add(chapterEntry(chapters.size(), item[0], item[1], zip, tocTitles.get(item[0])));
                    if (chapters.size() >= MAX_CHAPTERS) {
                        break;
                    }
                }
            }

            // OPF 不可用 / spine 为空时兜底：按 ZIP 顺序列出所有 html / xhtml
            if (chapters.isEmpty()) {
                for (String name : ExtractSupport.listEntries(zip)) {
                    if (isDocument(name, null)) {
                        chapters.add(chapterEntry(chapters.size(), name, null, zip, null));
                        if (chapters.size() >= MAX_CHAPTERS) {
                            break;
                        }
                    }
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("format", "epub");
            result.put("title", opf == null ? null : ExtractSupport.firstText(opf.document(), "title"));
            result.put("chapters", chapters);
            return result;
        }
    }

    /** 读 EPUB 内的一个资源 entry（章节正文 / 图片 / CSS / 字体…） */
    public Resource epubResource(Book book, String path) throws Exception {
        String entry = safeEntry(path);
        Path cached = bookFileService.ensureCached(book);
        try (ZipFile zip = new ZipFile(cached.toFile())) {
            byte[] data = ExtractSupport.readEntry(zip, entry);
            if (data == null) {
                return null;
            }
            return new Resource(data, mimeOf(entry));
        }
    }

    private Map<String, Object> chapterEntry(int index, String path, String mediaType, ZipFile zip,
                                            String tocTitle) {
        Map<String, Object> chapter = new LinkedHashMap<>();
        chapter.put("index", index);
        chapter.put("path", path);
        chapter.put("mediaType", mediaType);
        chapter.put("title", firstNonBlank(tocTitle, readTitle(zip, path), "第 " + (index + 1) + " 章"));
        return chapter;
    }

    /**
     * 从 EPUB3 nav 或 EPUB2 NCX 里读「章节文件 → 标题」映射。
     *
     * <p>XHTML 的 {@code <title>} 经常是书名而不是章节名，目录文件才是可靠来源；
     * 两者都读不到时调用方再回落 {@code <title>} / 「第 N 章」。
     */
    private Map<String, String> readTocTitles(ZipFile zip, Document opf, String opfDir) {
        Map<String, String> titles = new LinkedHashMap<>();
        try {
            String navHref = null;
            String ncxHref = null;
            String spineTocId = null;

            for (Element item : ExtractSupport.byLocalName(opf, "item")) {
                String id = item.getAttribute("id");
                String href = item.getAttribute("href");
                String properties = item.getAttribute("properties");
                if (navHref == null && properties != null && properties.toLowerCase().contains("nav") && !href.isBlank()) {
                    navHref = ExtractSupport.resolve(opfDir, href);
                }
                if (ncxHref == null && href != null && href.toLowerCase().endsWith(".ncx")) {
                    ncxHref = ExtractSupport.resolve(opfDir, href);
                }
                if (id != null && !id.isBlank() && href != null && href.toLowerCase().endsWith(".ncx")) {
                    ncxHref = ExtractSupport.resolve(opfDir, href);
                }
            }
            for (Element spine : ExtractSupport.byLocalName(opf, "spine")) {
                String toc = spine.getAttribute("toc");
                if (toc != null && !toc.isBlank()) {
                    spineTocId = toc;
                }
            }
            if (ncxHref == null && spineTocId != null) {
                for (Element item : ExtractSupport.byLocalName(opf, "item")) {
                    if (spineTocId.equals(item.getAttribute("id"))) {
                        ncxHref = ExtractSupport.resolve(opfDir, item.getAttribute("href"));
                        break;
                    }
                }
            }

            if (navHref != null) {
                byte[] navBytes = ExtractSupport.readEntry(zip, navHref);
                if (navBytes != null) {
                    collectNavTitles(navBytes, ExtractSupport.dirOf(navHref), titles);
                }
            }
            if (titles.isEmpty() && ncxHref != null) {
                byte[] ncxBytes = ExtractSupport.readEntry(zip, ncxHref);
                if (ncxBytes != null) {
                    collectNcxTitles(ncxBytes, ExtractSupport.dirOf(ncxHref), titles);
                }
            }
        } catch (Exception e) {
            log.debug("读取 EPUB 目录失败，回落到 <title>: {}", e.toString());
        }
        return titles;
    }

    private void collectNavTitles(byte[] navBytes, String navDir, Map<String, String> titles) {
        try {
            Document nav = ExtractSupport.parseXml(navBytes);
            for (Element anchor : ExtractSupport.byLocalName(nav, "a")) {
                String href = anchor.getAttribute("href");
                String text = ExtractSupport.text(anchor);
                if (href == null || href.isBlank() || text == null) {
                    continue;
                }
                titles.putIfAbsent(ExtractSupport.resolve(navDir, href), text);
            }
        } catch (Exception e) {
            // 有些 nav 不是严格 XML，退回正则
            String html = new String(navBytes, java.nio.charset.StandardCharsets.UTF_8);
            Matcher matcher = Pattern.compile("(?is)<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>").matcher(html);
            while (matcher.find()) {
                String text = ExtractSupport.stripHtml(matcher.group(2));
                if (text != null) {
                    titles.putIfAbsent(ExtractSupport.resolve(navDir, matcher.group(1)), text);
                }
            }
        }
    }

    private void collectNcxTitles(byte[] ncxBytes, String ncxDir, Map<String, String> titles) {
        try {
            Document ncx = ExtractSupport.parseXml(ncxBytes);
            for (Element navPoint : ExtractSupport.byLocalName(ncx, "navPoint")) {
                String text = null;
                String src = null;
                for (Element label : descendantsByLocalName(navPoint, "text")) {
                    text = ExtractSupport.text(label);
                    if (text != null) {
                        break;
                    }
                }
                for (Element content : descendantsByLocalName(navPoint, "content")) {
                    String value = content.getAttribute("src");
                    if (value != null && !value.isBlank()) {
                        src = value;
                        break;
                    }
                }
                if (text != null && src != null) {
                    titles.putIfAbsent(ExtractSupport.resolve(ncxDir, src), text);
                }
            }
        } catch (Exception ignored) {
            // NCX 损坏就只用 <title>
        }
    }

    /** 从章节 XHTML 里取 &lt;title&gt;；读不到返回 null */
    private String readTitle(ZipFile zip, String path) {
        try {
            byte[] data = ExtractSupport.readEntry(zip, path);
            if (data == null || data.length == 0) {
                return null;
            }
            // 标题一定在文件靠前的位置，只解前 16KB 足够
            String head = new String(data, 0, Math.min(data.length, 16 * 1024), java.nio.charset.StandardCharsets.UTF_8);
            Matcher matcher = TITLE_PATTERN.matcher(head);
            if (!matcher.find()) {
                return null;
            }
            return ExtractSupport.stripHtml(matcher.group(1));
        } catch (Exception ignored) {
            return null;
        }
    }

    // ============================================================
    // CBZ
    // ============================================================

    public Map<String, Object> cbzManifest(Book book) throws Exception {
        Path cached = bookFileService.ensureCached(book);
        try (ZipFile zip = new ZipFile(cached.toFile())) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("format", "cbz");
            result.put("title", book.getBookName());
            result.put("pageCount", com.xupt.book.file.extractor.CbxExtractor.listPages(zip).size());
            return result;
        }
    }

    /** 读 CBZ 的第 index 页（0 基，按自然序） */
    public Resource cbzPage(Book book, int index) throws Exception {
        Path cached = bookFileService.ensureCached(book);
        try (ZipFile zip = new ZipFile(cached.toFile())) {
            String entry = com.xupt.book.file.extractor.CbxExtractor.pageEntry(zip, index);
            if (entry == null) {
                return null;
            }
            byte[] data = ExtractSupport.readEntry(zip, entry);
            if (data == null) {
                return null;
            }
            return new Resource(data, mimeOf(entry));
        }
    }

    // ============================================================
    // OPF
    // ============================================================

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

    /** 是不是可当章节渲染的文档 entry */
    private boolean isDocument(String path, String mediaType) {
        if (mediaType != null && !mediaType.isBlank()) {
            String lower = mediaType.toLowerCase();
            if (lower.contains("xhtml") || lower.contains("html")) {
                return true;
            }
            // EPUB 里明确声明不是文档的（图片 / css / 字体）直接排除
            if (lower.startsWith("image/") || lower.startsWith("font/")
                    || lower.contains("css") || lower.contains("javascript")) {
                return false;
            }
        }
        String lower = path.toLowerCase();
        return lower.endsWith(".xhtml") || lower.endsWith(".html") || lower.endsWith(".htm");
    }

    /**
     * 资源路径白名单校验。
     *
     * <p>只允许 ZIP 内的普通 entry 名，拒绝绝对路径与 {@code ..}——
     * 虽然 {@link ZipFile#getEntry} 本身也走不出 ZIP，但这层校验能挡住明显异常输入。
     */
    private String safeEntry(String path) {
        if (path == null || path.isBlank() || path.length() > 512) {
            throw new IllegalArgumentException("非法的资源路径");
        }
        String clean = path.replace('\\', '/');
        if (clean.startsWith("/") || clean.contains("..")) {
            throw new IllegalArgumentException("非法的资源路径");
        }
        return clean;
    }

    /** 在某个元素内部按本地名找后代（{@code ExtractSupport.byLocalName} 只接受 Document） */
    private List<Element> descendantsByLocalName(Element parent, String localName) {
        List<Element> result = new ArrayList<>();
        NodeList all = parent.getElementsByTagName("*");
        for (int i = 0; i < all.getLength(); i++) {
            Element element = (Element) all.item(i);
            if (localName.equalsIgnoreCase(ExtractSupport.localNameOf(element))) {
                result.add(element);
            }
        }
        return result;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    /** ZIP 内的资源 MIME。注意不能复用 {@code ExtractSupport.mimeFromName}——那个只认图片。 */
    static String mimeOf(String name) {
        String lower = name == null ? "" : name.toLowerCase();
        if (lower.endsWith(".xhtml") || lower.endsWith(".html") || lower.endsWith(".htm")) {
            return "application/xhtml+xml";
        }
        if (lower.endsWith(".css")) {
            return "text/css";
        }
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) {
            return "application/javascript";
        }
        if (lower.endsWith(".svg")) {
            return "image/svg+xml";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".gif")) {
            return "image/gif";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".bmp")) {
            return "image/bmp";
        }
        if (lower.endsWith(".avif")) {
            return "image/avif";
        }
        if (lower.endsWith(".ttf")) {
            return "font/ttf";
        }
        if (lower.endsWith(".otf")) {
            return "font/otf";
        }
        if (lower.endsWith(".woff")) {
            return "font/woff";
        }
        if (lower.endsWith(".woff2")) {
            return "font/woff2";
        }
        if (lower.endsWith(".mp3")) {
            return "audio/mpeg";
        }
        if (lower.endsWith(".m4a")) {
            return "audio/mp4";
        }
        if (lower.endsWith(".mp4")) {
            return "video/mp4";
        }
        if (lower.endsWith(".webm")) {
            return "video/webm";
        }
        if (lower.endsWith(".xml") || lower.endsWith(".ncx") || lower.endsWith(".opf")) {
            return "application/xml";
        }
        if (lower.endsWith(".txt")) {
            return "text/plain";
        }
        return "application/octet-stream";
    }

    /** 解析出来的 OPF：文档 + 它所在目录（manifest href 相对它解析） */
    private record Opf(Document document, String dir) {
    }

    /** 一个 ZIP 内资源：字节 + MIME */
    public record Resource(byte[] data, String contentType) {
    }
}
