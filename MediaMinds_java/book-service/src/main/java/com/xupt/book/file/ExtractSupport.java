package com.xupt.book.file;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * 抽取器共用的工具方法。
 *
 * <p>EPUB 与 CBZ 都是 ZIP + XML，解析逻辑可以共用。
 */
public final class ExtractSupport {

    private ExtractSupport() {
    }

    /**
     * 解析 XML。
     *
     * <p>**必须关掉外部实体**：这里解析的是用户上传的文件，
     * 开着 DTD / 外部实体就是 XXE 漏洞（可以读服务器任意文件）。
     */
    public static Document parseXml(byte[] xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
    }

    /** 忽略命名空间前缀取本地名（dc:title → title） */
    public static String localNameOf(Element element) {
        String localName = element.getLocalName();
        if (localName != null) {
            return localName;
        }
        String nodeName = element.getNodeName();
        int idx = nodeName.indexOf(':');
        return idx >= 0 ? nodeName.substring(idx + 1) : nodeName;
    }

    /** 按本地名找所有元素，大小写不敏感、忽略命名空间 */
    public static List<Element> byLocalName(Document doc, String localName) {
        List<Element> result = new ArrayList<>();
        NodeList all = doc.getElementsByTagName("*");
        for (int i = 0; i < all.getLength(); i++) {
            Element element = (Element) all.item(i);
            if (localName.equalsIgnoreCase(localNameOf(element))) {
                result.add(element);
            }
        }
        return result;
    }

    /** 取第一个匹配元素的文本；没有则返回 null（空串也当没有） */
    public static String firstText(Document doc, String localName) {
        List<Element> found = byLocalName(doc, localName);
        for (Element element : found) {
            String text = text(element);
            if (text != null) {
                return text;
            }
        }
        return null;
    }

    /** 元素文本，trim 后为空返回 null */
    public static String text(Element element) {
        if (element == null) {
            return null;
        }
        String value = element.getTextContent();
        if (value == null) {
            return null;
        }
        value = value.trim();
        return value.isEmpty() ? null : value;
    }

    /**
     * 把 ZIP 内的相对引用解析成规范路径。
     *
     * <p>如 {@code baseDir="OEBPS", href="../images/a.jpg"} → {@code "images/a.jpg"}。
     * 结果**不含前导斜杠**，可直接作为 ZIP entry 名。
     */
    public static String resolve(String baseDir, String href) {
        if (href == null) {
            return null;
        }
        // 去掉 fragment / query，并解码 %20 之类
        String clean = href;
        int hash = clean.indexOf('#');
        if (hash >= 0) {
            clean = clean.substring(0, hash);
        }
        int query = clean.indexOf('?');
        if (query >= 0) {
            clean = clean.substring(0, query);
        }
        clean = URLDecoder.decode(clean, StandardCharsets.UTF_8);

        List<String> parts = new ArrayList<>();
        if (baseDir != null && !baseDir.isEmpty()) {
            for (String part : baseDir.split("/")) {
                if (!part.isEmpty()) {
                    parts.add(part);
                }
            }
        }
        for (String part : clean.split("/")) {
            if (part.isEmpty() || ".".equals(part)) {
                continue;
            }
            if ("..".equals(part)) {
                if (!parts.isEmpty()) {
                    parts.remove(parts.size() - 1);
                }
            } else {
                parts.add(part);
            }
        }
        return String.join("/", parts);
    }

    /** 取路径的目录部分（不含文件名）；根目录返回空串 */
    public static String dirOf(String path) {
        if (path == null) {
            return "";
        }
        int idx = path.lastIndexOf('/');
        return idx < 0 ? "" : path.substring(0, idx);
    }

    /**
     * 归一化日期到 {@code yyyy-MM-dd}。
     *
     * <p>兼容 {@code 2021-03-05} / {@code 2021-03} / {@code 2021} /
     * {@code 2021-03-05T00:00:00Z} 等常见写法；认不出返回 null。
     */
    public static String normalizeDate(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.trim();
        if (value.isEmpty()) {
            return null;
        }
        // 只保留数字与连字符，去掉时间部分
        int tIdx = value.indexOf('T');
        if (tIdx > 0) {
            value = value.substring(0, tIdx);
        }
        int spaceIdx = value.indexOf(' ');
        if (spaceIdx > 0) {
            value = value.substring(0, spaceIdx);
        }
        String[] parts = value.split("-");
        try {
            if (parts.length >= 3) {
                int year = Integer.parseInt(parts[0].trim());
                int month = Integer.parseInt(parts[1].trim());
                int day = Integer.parseInt(parts[2].trim());
                if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
                    return null;
                }
                return String.format("%04d-%02d-%02d", year, month, day);
            }
            if (parts.length == 2) {
                int year = Integer.parseInt(parts[0].trim());
                int month = Integer.parseInt(parts[1].trim());
                if (year < 1000 || month < 1 || month > 12) {
                    return null;
                }
                return String.format("%04d-%02d-01", year, month);
            }
            if (parts.length == 1) {
                int year = Integer.parseInt(parts[0].trim());
                if (year < 1000) {
                    return null;
                }
                return String.format("%04d-01-01", year);
            }
        } catch (NumberFormatException ignored) {
            // 认不出就返回 null，由用户或在线补全填
        }
        return null;
    }

    /** 从 ISBN 字符串里挑出 13 位或 10 位号；返回 {@code [isbn13, isbn10]}，认不出为 null */
    public static String[] splitIsbn(String raw) {
        if (raw == null) {
            return new String[]{null, null};
        }
        StringBuilder digits = new StringBuilder();
        for (char c : raw.toCharArray()) {
            if (Character.isDigit(c)) {
                digits.append(c);
            } else if (c == 'X' || c == 'x') {
                digits.append('X');
            }
        }
        String value = digits.toString();
        String isbn13 = null;
        String isbn10 = null;
        // 优先取 13 位（可能前面带 "978"/"979"）
        if (value.length() >= 13) {
            String candidate = value.substring(0, 13);
            if (candidate.startsWith("978") || candidate.startsWith("979")) {
                isbn13 = candidate;
            }
        }
        if (isbn13 == null && value.length() == 10) {
            isbn10 = value;
        } else if (isbn13 != null && value.length() >= 23) {
            // 形如 9781234567890 再加一个 10 位
            isbn10 = value.substring(13, 23);
        }
        return new String[]{isbn13, isbn10};
    }

    /** 按扩展名猜 MIME；认不出给 application/octet-stream */
    public static String mimeFromName(String name) {
        if (name == null) {
            return "application/octet-stream";
        }
        String lower = name.toLowerCase();
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
        if (lower.endsWith(".svg")) {
            return "image/svg+xml";
        }
        return "application/octet-stream";
    }

    /** 扩展名（含点），认不出返回 .bin */
    public static String extensionFromName(String name) {
        String mime = mimeFromName(name);
        return switch (mime) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "image/bmp" -> ".bmp";
            case "image/svg+xml" -> ".svg";
            default -> ".bin";
        };
    }

    /** 是否是图片 entry（CBZ 只认图片） */
    public static boolean isImage(String name) {
        return !"application/octet-stream".equals(mimeFromName(name));
    }

    /**
     * 读 ZIP 内的一个 entry。
     *
     * <p>先按精确名找，找不到再做一次大小写不敏感的扫描——
     * 部分 EPUB 生成器会写出与 OPF 声明大小写不一致的 entry 名。
     */
    public static byte[] readEntry(java.util.zip.ZipFile zip, String name) throws Exception {
        if (name == null) {
            return null;
        }
        java.util.zip.ZipEntry entry = zip.getEntry(name);
        if (entry == null) {
            java.util.Enumeration<? extends java.util.zip.ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                java.util.zip.ZipEntry candidate = entries.nextElement();
                if (candidate.getName().equalsIgnoreCase(name)) {
                    entry = candidate;
                    break;
                }
            }
        }
        if (entry == null || entry.isDirectory()) {
            return null;
        }
        try (java.io.InputStream in = zip.getInputStream(entry)) {
            return in.readAllBytes();
        }
    }

    /** 列出 ZIP 内所有非目录 entry 名 */
    public static List<String> listEntries(java.util.zip.ZipFile zip) {
        List<String> names = new ArrayList<>();
        java.util.Enumeration<? extends java.util.zip.ZipEntry> entries = zip.entries();
        while (entries.hasMoreElements()) {
            java.util.zip.ZipEntry entry = entries.nextElement();
            if (!entry.isDirectory()) {
                names.add(entry.getName());
            }
        }
        return names;
    }

    /** 去掉 HTML 标签并压缩空白（EPUB 的 dc:description 常带 HTML） */
    public static String stripHtml(String raw) {
        if (raw == null) {
            return null;
        }
        String text = raw.replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ");
        text = text.replaceAll("(?s)<[^>]+>", " ");
        text = text.replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'");
        text = text.replaceAll("\\s+", " ").trim();
        return text.isEmpty() ? null : text;
    }

    /**
     * 自然序比较：{@code page2 < page10}。
     *
     * <p>CBZ 的页序必须按自然序排，纯字典序会把第 10 页排到第 2 页前面。
     */
    public static int naturalCompare(String a, String b) {
        int i = 0;
        int j = 0;
        while (i < a.length() && j < b.length()) {
            char ca = a.charAt(i);
            char cb = b.charAt(j);
            if (Character.isDigit(ca) && Character.isDigit(cb)) {
                int si = i;
                int sj = j;
                while (i < a.length() && Character.isDigit(a.charAt(i))) {
                    i++;
                }
                while (j < b.length() && Character.isDigit(b.charAt(j))) {
                    j++;
                }
                String na = a.substring(si, i).replaceFirst("^0+(?=.)", "");
                String nb = b.substring(sj, j).replaceFirst("^0+(?=.)", "");
                int cmp = na.length() != nb.length() ? na.length() - nb.length() : na.compareTo(nb);
                if (cmp != 0) {
                    return cmp;
                }
            } else {
                if (ca != cb) {
                    return ca - cb;
                }
                i++;
                j++;
            }
        }
        return (a.length() - i) - (b.length() - j);
    }
}
