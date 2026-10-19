package com.xupt.book.file;

import com.xupt.book.DTO.Result;
import com.xupt.book.Pojo.Book;
import com.xupt.book.Service.BookService;
import com.xupt.book.Utils.MinioUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/**
 * 把本地元数据写回 EPUB 文件（阶段 5）。
 *
 * <p>流程：本地缓存里读出 EPUB → 改写 OPF 里的 {@code dc:title / dc:creator / dc:publisher /
 * dc:date / dc:language / dc:description} → 重新打包 → 覆盖 MinIO 上的原对象 → 清本地缓存。
 *
 * <p>**只改元数据，不动正文与资源**；ZIP 里的其它 entry 原样复制。`mimetype` 必须第一个写入
 * 且不压缩（EPUB 规范要求），否则部分阅读器会判为损坏。
 *
 * <p>只支持 EPUB——PDF / CBZ 没有统一的可写元数据容器，不在本阶段范围内。
 */
@Slf4j
@Service
public class BookFileWriteBackService {

    private static final String CONTAINER_PATH = "META-INF/container.xml";

    private final BookFileService bookFileService;
    private final BookService bookService;

    public BookFileWriteBackService(BookFileService bookFileService, BookService bookService) {
        this.bookFileService = bookFileService;
        this.bookService = bookService;
    }

    /** 把当前元数据写回 EPUB 文件 */
    public Result<?> writeBack(Integer bookId) {
        Book book = bookFileService.loadBookWithFile(bookId);
        if (book == null) {
            return Result.error(404, "这本书没有上传文件");
        }
        if (!"epub".equalsIgnoreCase(book.getFileFormat())) {
            return Result.error(400, "目前只支持把元数据写回 EPUB");
        }
        Path source = null;
        Path target = null;
        try {
            source = bookFileService.ensureCached(book);
            target = source.resolveSibling("writeback-" + UUID.randomUUID() + ".epub");
            rewriteEpub(source, target, book);

            long size = Files.size(target);
            MinioUtil.uploadFile(book.getFileKey(), target.toFile(), BookFormat.EPUB.contentType());
            bookFileService.evictCache(bookId);
            // 覆盖后大小可能变，回写文件信息（保持原对象名）
            bookService.attachFile(bookId, book.getFileKey(), "epub", size, book.getFileName());

            return Result.success("已把当前元数据写回 EPUB 文件");
        } catch (Exception e) {
            log.error("写回 EPUB 失败 bookId={}: {}", bookId, e.toString(), e);
            return Result.error(500, "写回失败: " + e.getMessage());
        } finally {
            deleteQuietly(target);
        }
    }

    // ============================================================
    // EPUB 重打包
    // ============================================================

    private void rewriteEpub(Path source, Path target, Book book) throws Exception {
        try (ZipFile zip = new ZipFile(source.toFile());
             ZipOutputStream out = new ZipOutputStream(Files.newOutputStream(target))) {
            String opfPath = findOpfPath(zip);

            // mimetype 必须第一个、STORED
            byte[] mimetype = ExtractSupport.readEntry(zip, "mimetype");
            if (mimetype != null) {
                writeEntry(out, "mimetype", mimetype, true);
            }

            for (String name : ExtractSupport.listEntries(zip)) {
                if ("mimetype".equals(name)) {
                    continue;
                }
                byte[] data = ExtractSupport.readEntry(zip, name);
                if (data == null) {
                    continue;
                }
                boolean isDirectoryLike = name.endsWith("/");
                if (name.equals(opfPath) && !isDirectoryLike) {
                    data = updateOpf(data, book);
                }
                writeEntry(out, name, data, false);
            }
        }
    }

    private String findOpfPath(ZipFile zip) throws Exception {
        byte[] container = ExtractSupport.readEntry(zip, CONTAINER_PATH);
        if (container == null) {
            throw new IllegalStateException("EPUB 缺少 META-INF/container.xml");
        }
        Document doc = ExtractSupport.parseXml(container);
        for (Element rootfile : ExtractSupport.byLocalName(doc, "rootfile")) {
            String fullPath = rootfile.getAttribute("full-path");
            if (fullPath != null && !fullPath.isBlank()) {
                return fullPath.trim();
            }
        }
        throw new IllegalStateException("EPUB 的 container.xml 里没有 rootfile");
    }

    /** 改写 OPF 里已有的元数据元素；没有的元素不动（不凭空插入，避免破坏结构） */
    private byte[] updateOpf(byte[] opfBytes, Book book) throws Exception {
        Document doc = ExtractSupport.parseXml(opfBytes);

        setFirstText(doc, "title", book.getBookName());
        setFirstText(doc, "creator", book.getBookAuthor());
        setFirstText(doc, "publisher", book.getPublisher());
        setFirstText(doc, "language", book.getLanguage());
        setFirstText(doc, "description", book.getBookDetails());
        if (book.getPublishedDate() != null) {
            setFirstText(doc, "date", book.getPublishedDate().toString());
        }

        Transformer transformer = TransformerFactory.newInstance().newTransformer();
        transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
        transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
        transformer.setOutputProperty(OutputKeys.INDENT, "no");

        try (ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            transformer.transform(new DOMSource(doc), new StreamResult(buffer));
            return buffer.toByteArray();
        }
    }

    /** 把所有同名（忽略命名空间）元素里第一个的文本改成新值 */
    private void setFirstText(Document doc, String localName, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        NodeList nodes = doc.getElementsByTagName("*");
        for (int i = 0; i < nodes.getLength(); i++) {
            Element element = (Element) nodes.item(i);
            if (localName.equalsIgnoreCase(ExtractSupport.localNameOf(element))) {
                element.setTextContent(value.trim());
                return;
            }
        }
    }

    private void writeEntry(ZipOutputStream out, String name, byte[] data, boolean stored) throws IOException {
        ZipEntry entry = new ZipEntry(name);
        if (stored) {
            CRC32 crc = new CRC32();
            crc.update(data);
            entry.setMethod(ZipEntry.STORED);
            entry.setSize(data.length);
            entry.setCompressedSize(data.length);
            entry.setCrc(crc.getValue());
        }
        out.putNextEntry(entry);
        out.write(data);
        out.closeEntry();
    }

    private void deleteQuietly(Path path) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // 尽力清理
        }
    }
}
