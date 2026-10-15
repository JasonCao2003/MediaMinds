package com.xupt.video.Utils;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;

import java.io.InputStream;

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
     * @param objectName 对象名称，如 video/uuid.mp4
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

    public static InputStream downloadFile(String objectName) throws Exception {
        objectName = toObjectName(objectName);
        return client().getObject(GetObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .build());
    }

    public static void deleteFile(String objectName) throws Exception {
        objectName = toObjectName(objectName);
        client().removeObject(RemoveObjectArgs.builder()
                .bucket(BUCKET_NAME)
                .object(objectName)
                .build());
    }
}
