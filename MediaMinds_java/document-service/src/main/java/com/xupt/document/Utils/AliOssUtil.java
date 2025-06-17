package com.xupt.document.Utils;

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

    /**
     * 上传文件到阿里云OSS
     * @param objectName 对象名称，如 documents/uuid.pdf
     * @param in 文件输入流
     * @return 文件访问URL
     */
    public static String uploadFile(String objectName, InputStream in) throws Exception {
        EnvironmentVariableCredentialsProvider credentialsProvider = CredentialsProviderFactory.newEnvironmentVariableCredentialsProvider();
        String url = "";
        // 创建OSSClient实例
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
            throw oe;
        } catch (ClientException ce) {
            System.out.println("Caught an ClientException, which means the client encountered "
                    + "a serious internal problem while trying to communicate with OSS, "
                    + "such as not being able to access the network.");
            System.out.println("Error Message:" + ce.getMessage());
            throw ce;
        } finally {
            ossClient.shutdown();
        }
        return url;
    }

    /**
     * 从阿里云OSS下载文件
     * @param objectName 对象名称或完整URL
     * @return 文件内容字符串
     */
    public static InputStream downloadFile(String objectName) throws Exception {
        // 如果是完整URL，提取对象名
        if (objectName.startsWith("http")) {
            try {
                java.net.URL url = new java.net.URL(objectName);
                String path = url.getPath();
                if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                objectName = java.net.URLDecoder.decode(path, "UTF-8");
            } catch (Exception e) {
                throw new Exception("URL格式不正确: " + e.getMessage());
            }
        }
        
        EnvironmentVariableCredentialsProvider credentialsProvider = CredentialsProviderFactory.newEnvironmentVariableCredentialsProvider();
        // 创建OSSClient实例
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
                throw new Exception("文件在OSS中不存在: " + objectName);
            }
            
            // 下载文件到输入流
            return ossClient.getObject(BUCKET_NAME, objectName).getObjectContent();
        } catch (OSSException oe) {
            throw new Exception("OSS下载失败: " + oe.getErrorMessage());
        } catch (ClientException ce) {
            throw new Exception("OSS客户端错误: " + ce.getMessage());
        }
    }
    
    /**
     * 删除OSS中的文件
     * @param objectName 对象名称或完整URL
     */
    public static void deleteFile(String objectName) throws Exception {
        // 如果是完整URL，提取对象名
        if (objectName.startsWith("http")) {
            try {
                java.net.URL url = new java.net.URL(objectName);
                String path = url.getPath();
                if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                objectName = java.net.URLDecoder.decode(path, "UTF-8");
            } catch (Exception e) {
                throw new Exception("URL格式不正确: " + e.getMessage());
            }
        }
        
        EnvironmentVariableCredentialsProvider credentialsProvider = CredentialsProviderFactory.newEnvironmentVariableCredentialsProvider();
        // 创建OSSClient实例
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
                throw new Exception("文件在OSS中不存在: " + objectName);
            }
            
            // 删除文件
            ossClient.deleteObject(BUCKET_NAME, objectName);
        } catch (OSSException oe) {
            throw new Exception("OSS删除失败: " + oe.getErrorMessage());
        } catch (ClientException ce) {
            throw new Exception("OSS客户端错误: " + ce.getMessage());
        } finally {
            ossClient.shutdown();
        }
    }
} 