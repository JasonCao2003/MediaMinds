package com.xupt.book.file.extractor;

import com.xupt.book.file.BookFileExtractor;
import com.xupt.book.file.BookFormat;
import com.xupt.book.file.CoverImage;
import com.xupt.book.file.ExtractSupport;
import com.xupt.book.file.ExtractedMetadata;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.common.PDMetadata;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PDF 元数据抽取（Apache PDFBox）。
 *
 * <p>两个来源，Info 字典优先、XMP 补缺：
 * <ul>
 *   <li>Info 字典：Title / Author / Subject / Keywords / CreationDate</li>
 *   <li>XMP（Dublin Core）：dc:title / dc:creator / dc:publisher / dc:date / dc:language / dc:identifier</li>
 * </ul>
 *
 * <p>封面 = 渲染第 1 页。渲染是有代价的（CPU + 内存），所以**限宽 900px**
 * 并只在抽取封面时做，元数据抽取本身不渲染。
 */
@Component
public class PdfExtractor implements BookFileExtractor {

    /** 封面渲染 DPI：够看清又不至于把大页面渲染成几千万像素 */
    private static final int COVER_DPI = 96;
    /** 封面最大宽度，超过则等比缩小 */
    private static final int COVER_MAX_WIDTH = 900;

    @Override
    public BookFormat format() {
        return BookFormat.PDF;
    }

    @Override
    public ExtractedMetadata extract(Path file) throws Exception {
        ExtractedMetadata meta = new ExtractedMetadata();
        try (PDDocument doc = Loader.loadPDF(file.toFile())) {
            PDDocumentInformation info = doc.getDocumentInformation();
            Map<String, String> xmp = readXmp(doc);

            meta.setBookName(firstNonBlank(info.getTitle(), xmp.get("title"), fileNameTitle(file)));
            meta.setBookAuthor(firstNonBlank(info.getAuthor(), xmp.get("creator")));
            meta.setSubtitle(xmp.get("subtitle"));
            meta.setBookDetails(firstNonBlank(info.getSubject(), xmp.get("description")));
            meta.setPublisher(xmp.get("publisher"));
            meta.setLanguage(xmp.get("language"));
            meta.setPublishedDate(ExtractSupport.normalizeDate(
                    firstNonBlank(xmp.get("date"), infoDate(info))));

            int pages = doc.getNumberOfPages();
            meta.setPageCount(pages);
            meta.setChapterCount(pages);

            String[] isbn = ExtractSupport.splitIsbn(
                    firstNonBlank(xmp.get("identifier"), info.getKeywords(), info.getSubject()));
            meta.setIsbn13(isbn[0]);
            meta.setIsbn10(isbn[1]);

            if (meta.getBookName() == null) {
                meta.note("PDF 没有标题信息");
            }
            if (meta.getBookAuthor() == null) {
                meta.note("PDF 没有作者信息");
            }
            if (pages == 0) {
                meta.note("PDF 没有页面");
            } else {
                meta.setHasCover(true);
            }
        }
        return meta;
    }

    @Override
    public CoverImage extractCover(Path file) throws Exception {
        try (PDDocument doc = Loader.loadPDF(file.toFile())) {
            if (doc.getNumberOfPages() == 0) {
                return null;
            }
            PDFRenderer renderer = new PDFRenderer(doc);
            BufferedImage image = renderer.renderImageWithDPI(0, COVER_DPI, ImageType.RGB);
            image = shrink(image, COVER_MAX_WIDTH);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", out);
            byte[] data = out.toByteArray();
            if (data.length == 0) {
                return null;
            }
            return new CoverImage(data, "image/jpeg", ".jpg");
        } catch (Exception e) {
            // 渲染失败（加密 / 字体缺失 / 畸形页）不该让整个上传流程失败
            return null;
        }
    }

    private BufferedImage shrink(BufferedImage image, int maxWidth) {
        if (image.getWidth() <= maxWidth) {
            return image;
        }
        int height = (int) (image.getHeight() * (maxWidth / (double) image.getWidth()));
        BufferedImage scaled = new BufferedImage(maxWidth, Math.max(1, height), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = scaled.createGraphics();
        graphics.drawImage(image, 0, 0, maxWidth, height, null);
        graphics.dispose();
        return scaled;
    }

    // ============================================================
    // XMP（Dublin Core）
    // ============================================================

    private Map<String, String> readXmp(PDDocument doc) {
        Map<String, String> result = new HashMap<>();
        try {
            PDMetadata metadata = doc.getDocumentCatalog().getMetadata();
            if (metadata == null) {
                return result;
            }
            byte[] bytes;
            try (InputStream in = metadata.createInputStream()) {
                bytes = in.readAllBytes();
            }
            Document xmp = ExtractSupport.parseXml(bytes);
            // dc:title / dc:description 是 rdf:Alt，取文本内容即可（会包含内层 rdf:li）
            result.put("title", ExtractSupport.firstText(xmp, "title"));
            result.put("description", ExtractSupport.stripHtml(ExtractSupport.firstText(xmp, "description")));
            result.put("publisher", ExtractSupport.firstText(xmp, "publisher"));
            result.put("date", ExtractSupport.firstText(xmp, "date"));
            result.put("language", ExtractSupport.firstText(xmp, "language"));
            result.put("identifier", ExtractSupport.firstText(xmp, "identifier"));
            // dc:creator 是 rdf:Seq，可能有多个 rdf:li，需要逐个取再拼接
            result.put("creator", joinListItems(xmp, "creator"));
            // PDF 常见扩展：xmp:Title 之外的系列信息没有统一规范，不强求
        } catch (Exception ignored) {
            // XMP 缺失或损坏是常态，静默跳过，Info 字典兜底
        }
        return result;
    }

    /** 取 {@code <dc:X><rdf:Seq><rdf:li>...} 里的所有 li，用逗号连接 */
    private String joinListItems(Document doc, String containerLocalName) {
        List<String> values = new ArrayList<>();
        for (Element container : ExtractSupport.byLocalName(doc, containerLocalName)) {
            NodeList items = container.getElementsByTagNameNS("*", "li");
            for (int i = 0; i < items.getLength(); i++) {
                String text = items.item(i).getTextContent();
                if (text != null && !text.isBlank()) {
                    String trimmed = text.trim();
                    if (!values.contains(trimmed)) {
                        values.add(trimmed);
                    }
                }
            }
        }
        return values.isEmpty() ? null : String.join(", ", values);
    }

    private String infoDate(PDDocumentInformation info) {
        Calendar created = info.getCreationDate();
        if (created == null) {
            return null;
        }
        return String.format("%04d-%02d-%02d",
                created.get(Calendar.YEAR), created.get(Calendar.MONTH) + 1, created.get(Calendar.DAY_OF_MONTH));
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
}
