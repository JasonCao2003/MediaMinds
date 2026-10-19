package com.xupt.book.Utils;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

public class MinioUtil {

    private static final String ENDPOINT = env("MINIO_ENDPOINT", "http://localhost:9000");
    private static final String ACCESS_KEY = env("MINIO_ACCESS_KEY", "minioadmin");
    private static final String SECRET_KEY = env("MINIO_SECRET_KEY", "minioadmin");
    private static final String BUCKET_NAME = env("MINIO_BUCKET", "mediaminds");

    private static String env(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value == null || value.isEmpty()) ? defaultValue : value;
    }

    private static String baseUrl() {
        return ENDPOINT.endsWith("/") ? ENDPOINT.substring(0, ENDPOINT.length() - 1) : ENDPOINT;
    }

    private static MinioClient client() {
        return MinioClient.builder()
                .endpoint(ENDPOINT)
                .credentials(ACCESS_KEY, SECRET_KEY)
                .build();
    }

    private static void ensureBucket(MinioClient minioClient) throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(BUCKET_NAME).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(BUCKET_NAME).build());
        }
    }

    private static String toObjectName(String objectName) throws Exception {
        if (objectName != null && objectName.startsWith("http")) {
            java.net.URL url = new java.net.URL(objectName);
            String path = url.getPath();
            if (path.startsWith("/")) {
                path = path.substring(1);
            }
            String prefix = BUCKET_NAME + "/";
            if (path.startsWith(prefix)) {
                path = path.substring(prefix.length());
            }
            objectName = java.net.URLDecoder.decode(path, "UTF-8");
        }
        return objectName;
    }

    /**
     * 上传文件到 MinIO
     * @param objectName 对象名称，如 book/uuid.jpg
     * @param in 文件输入流
     * @return 文件访问URL
     */
    public static String UploadFile(String objectName, InputStream in) throws Exception {
        MinioClient minioClient = client();
        ensureBucket(minioClient);
        minioClient.putObject(PutObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .stream(in, -1, 10485760)
                .build());
        return baseUrl() + "/" + BUCKET_NAME + "/" + objectName;
    }

    /**
     * 从 MinIO 下载文件并返回文本内容
     * @param objectName 对象名称或完整URL
     * @return 文件内容字符串
     */
    public static String downloadFile(String objectName) throws Exception {
        objectName = toObjectName(objectName);
        try (InputStream inputStream = client().getObject(GetObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .build())) {
            java.util.Scanner s = new java.util.Scanner(inputStream, "UTF-8").useDelimiter("\\A");
            return s.hasNext() ? s.next() : "";
        }
    }

    public static void deleteFile(String objectName) throws Exception {
        objectName = toObjectName(objectName);
        client().removeObject(RemoveObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .build());
    }

    /**
     * 上传文件到 MinIO（指定 Content-Type）。
     *
     * <p>图书文件必须带正确的 MIME：浏览器按它决定怎么渲染 EPUB / PDF / 图片。
     */
    public static String UploadFile(String objectName, InputStream in, String contentType) throws Exception {
        MinioClient minioClient = client();
        ensureBucket(minioClient);
        PutObjectArgs.Builder builder = PutObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .stream(in, -1, 10485760);
        if (contentType != null && !contentType.isBlank()) {
            builder.contentType(contentType);
        }
        minioClient.putObject(builder.build());
        return baseUrl() + "/" + BUCKET_NAME + "/" + objectName;
    }

    /**
     * 从本地文件上传到 MinIO。
     *
     * <p>与 {@link #UploadFile(String, InputStream)} 的区别：这里给出**确切长度**，
     * MinIO 可以一次 PUT 完成，不必走分片；而且流直接来自文件，不占堆内存。
     * 图书文件（几十 MB 的 PDF）走这条。
     */
    public static String uploadFile(String objectName, File file, String contentType) throws Exception {
        MinioClient minioClient = client();
        ensureBucket(minioClient);
        PutObjectArgs.Builder builder = PutObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .stream(new FileInputStream(file), file.length(), -1);
        if (contentType != null && !contentType.isBlank()) {
            builder.contentType(contentType);
        }
        minioClient.putObject(builder.build());
        return baseUrl() + "/" + BUCKET_NAME + "/" + objectName;
    }

    /**
     * 从 MinIO 下载到本地文件。
     *
     * <p>供「本地缓存副本 + ZipFile 随机读资源」用：EPUB / CBZ 都是 ZIP，
     * 缓存一份到本地就能按需取单个 entry，不必每次请求都拉整个文件。
     * 用流式拷贝，大文件不占堆内存。
     */
    public static void downloadToFile(String objectName, File target) throws Exception {
        objectName = toObjectName(objectName);
        File parent = target.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IllegalStateException("无法创建目录: " + parent);
        }
        try (InputStream in = client().getObject(GetObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .build())) {
            Files.copy(in, target.toPath(), StandardCopyOption.REPLACE_EXISTING);
        }
    }

    /** 取对象字节数；对象不存在时抛异常 */
    public static long statSize(String objectName) throws Exception {
        objectName = toObjectName(objectName);
        return client().statObject(StatObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .build()).size();
    }

    /** 打开对象输入流（调用方负责关闭），用于把文件直接透传给 HTTP 响应 */
    public static InputStream openStream(String objectName) throws Exception {
        objectName = toObjectName(objectName);
        return client().getObject(GetObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .build());
    }
}
