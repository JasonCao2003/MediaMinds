package com.xupt.book.Utils;

import com.aliyun.oss.*;
import com.aliyun.oss.common.auth.CredentialsProviderFactory;
import com.aliyun.oss.common.auth.EnvironmentVariableCredentialsProvider;
import com.aliyun.oss.common.comm.SignVersion;
import com.aliyun.oss.model.PutObjectRequest;

import java.io.InputStream;

public class AliOssUtil {

    private static final String ENDPOINT = "https://oss-cn-beijing.aliyuncs.com";
    private static final String BUCKET_NAME = "mediaminds";
    private static final String REGION = "cn-beijing";


    public static String UploadFile(String objectName, InputStream in) throws Exception {
        EnvironmentVariableCredentialsProvider credentialsProvider = CredentialsProviderFactory.newEnvironmentVariableCredentialsProvider();
        String url = "";
        // 创建OSSClient实例。
        ClientBuilderConfiguration clientBuilderConfiguration = new ClientBuilderConfiguration();
        clientBuilderConfiguration.setSignatureVersion(SignVersion.V4);
        OSS ossClient = OSSClientBuilder.create()
                .endpoint(ENDPOINT)
                .credentialsProvider(credentialsProvider)
                .clientConfiguration(clientBuilderConfiguration)
                .region(REGION)
                .build();
        try {
            // 创建上传对象
            PutObjectRequest putObjectRequest = new PutObjectRequest(BUCKET_NAME, objectName, in);
            ossClient.putObject(putObjectRequest);
            url = "https://" + BUCKET_NAME + "." + ENDPOINT.substring(ENDPOINT.lastIndexOf("/") + 1) + "/" + objectName;
        } catch (OSSException oe) {
            System.out.println("Caught an OSSException, which means your request made it to OSS, "
                    + "but was rejected with an error response for some reason.");
            System.out.println("Error Message:" + oe.getErrorMessage());
            System.out.println("Error Code:" + oe.getErrorCode());
            System.out.println("Request ID:" + oe.getRequestId());
            System.out.println("Host ID:" + oe.getHostId());
        } catch (ClientException ce) {
            System.out.println("Caught an ClientException, which means the client encountered "
                    + "a serious internal problem while trying to communicate with OSS, "
                    + "such as not being able to access the network.");
            System.out.println("Error Message:" + ce.getMessage());
        } finally {
            ossClient.shutdown();
        }
        return url;
    }

    public static String downloadFile(String objectName) throws Exception {
        // 原始URL用于日志记录
        String originalUrl = objectName;
        
        // 检查objectName是否是完整URL，如果是，提取实际的对象名
        if (objectName.startsWith("http")) {
            try {
                // 处理URL中的中文字符
                java.net.URL url = new java.net.URL(objectName);
                String path = url.getPath();
                if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                // 判断域名部分
                String host = url.getHost();
                if (host.contains(BUCKET_NAME)) {
                    // 这是阿里云OSS的URL，路径就是对象名
                    objectName = java.net.URLDecoder.decode(path, "UTF-8");
                } else {
                    System.out.println("URL不是阿里云OSS域名: " + host);
                    throw new Exception("URL格式不正确，不是阿里云OSS域名");
                }
            } catch (Exception e) {
                System.out.println("处理URL失败: " + objectName + ", 错误: " + e.getMessage());
                // 继续尝试当作对象名处理
            }
        }
        
        System.out.println("处理前的路径: " + originalUrl);
        System.out.println("尝试下载文件: " + objectName);
        
        EnvironmentVariableCredentialsProvider credentialsProvider = CredentialsProviderFactory.newEnvironmentVariableCredentialsProvider();
        // 创建OSSClient实例。
        ClientBuilderConfiguration clientBuilderConfiguration = new ClientBuilderConfiguration();
        clientBuilderConfiguration.setSignatureVersion(SignVersion.V4);
        OSS ossClient = OSSClientBuilder.create()
                .endpoint(ENDPOINT)
                .credentialsProvider(credentialsProvider)
                .clientConfiguration(clientBuilderConfiguration)
                .region(REGION)
                .build();
                
        try {
            // 检查对象是否存在
            boolean exists = ossClient.doesObjectExist(BUCKET_NAME, objectName);
            if (!exists) {
                // 尝试编码后的对象名
                String encodedObjectName = java.net.URLEncoder.encode(objectName, "UTF-8");
                encodedObjectName = encodedObjectName.replace("+", "%20"); // 替换空格的编码
                System.out.println("原始对象不存在，尝试编码后的对象名: " + encodedObjectName);
                
                exists = ossClient.doesObjectExist(BUCKET_NAME, encodedObjectName);
                if (exists) {
                    objectName = encodedObjectName;
                } else {
                    throw new Exception("文件在OSS中不存在: " + objectName);
                }
            }
            
            // 下载文件到输入流
            InputStream inputStream = ossClient.getObject(BUCKET_NAME, objectName).getObjectContent();
            // 读取输入流为字符串
            java.util.Scanner s = new java.util.Scanner(inputStream).useDelimiter("\\A");
            String content = s.hasNext() ? s.next() : "";
            inputStream.close();
            return content;
        } catch (OSSException oe) {
            System.out.println("OSS下载错误: " + oe.getErrorMessage() + ", 对象: " + objectName);
            throw new Exception("OSS下载失败: " + oe.getErrorMessage());
        } catch (ClientException ce) {
            System.out.println("OSS客户端错误: " + ce.getMessage());
            throw new Exception("OSS客户端错误: " + ce.getMessage());
        } finally {
            ossClient.shutdown();
        }
    }
}
