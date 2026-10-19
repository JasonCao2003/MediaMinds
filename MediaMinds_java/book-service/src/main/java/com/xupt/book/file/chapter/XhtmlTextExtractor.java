package com.xupt.book.file.chapter;

import com.xupt.book.file.ExtractSupport;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * XHTML → 纯文本。
 *
 * <p>与 {@code ExtractSupport.stripHtml} 的区别：这里**保留段落结构**——块级元素后补换行，
 * `&lt;br&gt;` 转换行，最终把连续空行压成两行。章节正文阅读器和自动拆分都依赖它。
 */
public final class XhtmlTextExtractor {

    private static final Set<String> BLOCK_TAGS = Set.of(
            "p", "div", "section", "article", "header", "footer", "main", "aside",
            "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "blockquote", "pre",
            "table", "ul", "ol", "dl", "dt", "dd", "figure", "figcaption", "hr");

    private static final List<String> SKIP_TAGS = List.of("script", "style", "noscript", "head");

    private static final Pattern MULTI_BLANK = Pattern.compile("\\n{3,}");
    private static final Pattern INLINE_WS = Pattern.compile("[ \\t\\x0B\\f\\r]+");
    private static final Pattern SCRIPT_STYLE = Pattern.compile("(?is)<(script|style|noscript|head)[^>]*>.*?</\\1>");
    private static final Pattern BR = Pattern.compile("(?i)<br\\s*/?>");
    private static final Pattern BLOCK_CLOSE = Pattern.compile(
            "(?i)</(p|div|section|article|header|footer|h[1-6]|li|tr|blockquote|pre|table|figure)>");
    private static final Pattern ANY_TAG = Pattern.compile("(?s)<[^>]+>");

    private XhtmlTextExtractor() {
    }

    public static String extract(byte[] data) {
        if (data == null || data.length == 0) {
            return "";
        }
        try {
            Document doc = ExtractSupport.parseXml(data);
            return fromDom(doc);
        } catch (Exception e) {
            // 不是合法 XML 的 XHTML 也常见，回退到正则去标签
            return fromHtml(new String(data, StandardCharsets.UTF_8));
        }
    }

    /** 统计字数：CJK 字符按字计，拉丁文按词计 */
    public static int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        int cjk = 0;
        int latin = 0;
        boolean inWord = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (Character.UnicodeScript.of(c) == Character.UnicodeScript.HAN
                    || Character.UnicodeScript.of(c) == Character.UnicodeScript.HIRAGANA
                    || Character.UnicodeScript.of(c) == Character.UnicodeScript.KATAKANA
                    || Character.UnicodeScript.of(c) == Character.UnicodeScript.HANGUL) {
                cjk++;
                inWord = false;
            } else if (Character.isLetterOrDigit(c)) {
                if (!inWord) {
                    latin++;
                    inWord = true;
                }
            } else {
                inWord = false;
            }
        }
        return cjk + latin;
    }

    // ============================================================

    private static String fromDom(Document doc) {
        Element body = firstByLocalName(doc, "body");
        Element root = body != null ? body : doc.getDocumentElement();
        if (root == null) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        appendNode(root, out, false);
        return normalize(out.toString());
    }

    private static void appendNode(Node node, StringBuilder out, boolean skip) {
        if (node.getNodeType() == Node.TEXT_NODE || node.getNodeType() == Node.CDATA_SECTION_NODE) {
            if (!skip) {
                out.append(node.getNodeValue());
            }
            return;
        }
        if (node.getNodeType() != Node.ELEMENT_NODE) {
            return;
        }
        Element element = (Element) node;
        String name = ExtractSupport.localNameOf(element).toLowerCase();
        if (SKIP_TAGS.contains(name)) {
            return;
        }
        if ("br".equals(name)) {
            out.append('\n');
            return;
        }
        boolean block = BLOCK_TAGS.contains(name);
        if (block) {
            out.append('\n');
        }
        NodeList children = element.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            appendNode(children.item(i), out, false);
        }
        if (block) {
            out.append('\n');
        }
    }

    private static Element firstByLocalName(Document doc, String localName) {
        NodeList all = doc.getElementsByTagName("*");
        for (int i = 0; i < all.getLength(); i++) {
            Element element = (Element) all.item(i);
            if (localName.equalsIgnoreCase(ExtractSupport.localNameOf(element))) {
                return element;
            }
        }
        return null;
    }

    private static String fromHtml(String html) {
        String text = SCRIPT_STYLE.matcher(html).replaceAll(" ");
        text = BR.matcher(text).replaceAll("\n");
        text = BLOCK_CLOSE.matcher(text).replaceAll("\n");
        text = ANY_TAG.matcher(text).replaceAll("");
        text = text.replace("&nbsp;", " ")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&amp;", "&");
        return normalize(text);
    }

    private static String normalize(String raw) {
        String text = raw.replace("\r\n", "\n").replace('\r', '\n');
        text = INLINE_WS.matcher(text).replaceAll(" ");
        text = MULTI_BLANK.matcher(text).replaceAll("\n\n");
        // 每行去掉首尾空白
        String[] lines = text.split("\n", -1);
        StringBuilder out = new StringBuilder(text.length());
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                if (out.length() > 0 && out.charAt(out.length() - 1) != '\n') {
                    out.append('\n');
                }
                out.append('\n');
            } else {
                out.append(trimmed).append('\n');
            }
        }
        return out.toString().replaceAll("\\n{3,}", "\n\n").trim();
    }
}
