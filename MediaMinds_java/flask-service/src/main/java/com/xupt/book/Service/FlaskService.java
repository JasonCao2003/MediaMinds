package com.xupt.book.Service;

import com.xupt.book.DTO.Result;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONObject;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class FlaskService {

    private static final RestTemplate restTemplate = new RestTemplate();
    private static final String BASE_PATH = "http://localhost:5000";



    public String Face2User(MultipartFile file) throws Exception {
        String url = BASE_PATH + "/detect_faceid";
        Result<?> result = SendFile("image", file, url, null);
        if (result.getCode() != 1) {
            JSONObject jsonResponse = new JSONObject(result.getData().toString());
            JSONArray results = jsonResponse.getJSONArray("results");
            return results.getString(1).split(" ")[0];
        }
        return null;
    }

    public Result<?> SendText(String url, String text) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        String requestBody = "{\"text\": \"" + text + "\"}";
        HttpEntity<String> requestEntity = new HttpEntity<>(requestBody, headers);
        return SendRequest(url, requestEntity);
    }

    public Result<?> SendFile(String fileType, MultipartFile multipartFile, String url, String fileName) throws IOException {
        // 文件类型转换
        if (fileName == null) {
            fileName = multipartFile.getOriginalFilename();
        }
        File file = new File(System.getProperty("java.io.tmpdir") + File.separator + fileName);
        multipartFile.transferTo(file);
        // 构建HttpEntity
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        String mimeType = GetMimeType(multipartFile);
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part(fileType, new FileSystemResource(file)).header("Content-Type", mimeType);
        MultiValueMap<String, HttpEntity<?>> multipartRequest = builder.build();
        HttpEntity<MultiValueMap<String, HttpEntity<?>>> requestEntity = new HttpEntity<>(multipartRequest, headers);
        // 发送请求
        return SendRequest(url, requestEntity);
    }

    // 发送请求和响应处理
    private Result<?> SendRequest(String url, HttpEntity<?> requestEntity) {
        ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                String.class
        );
        if (response.getStatusCode().is2xxSuccessful()) {
            return Result.success(DecodeUnicode(response.getBody()));
        } else {
            return Result.error("请求失败，错误状态码：" + response.getStatusCodeValue());
        }
    }

    // 对响应内容重新编码
    private String DecodeUnicode(String str) {
        Pattern pattern = Pattern.compile("\\\\u([0-9a-fA-F]{4})");
        Matcher matcher = pattern.matcher(str);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String unicode = matcher.group(1);
            char ch = (char) Integer.parseInt(unicode, 16);
            matcher.appendReplacement(sb, String.valueOf(ch));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    // 获取上传文件的媒体类型
    private String GetMimeType(MultipartFile file) {
        String fileName = Objects.requireNonNull(file.getOriginalFilename()).toLowerCase();
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (fileName.endsWith(".png")) {
            return "image/png";
        } else if (fileName.endsWith(".wav")) {
            return "audio/wav";
        } else if (fileName.endsWith(".mp3")) {
            return "audio/mp3";
        } else {
            return MimeTypeUtils.APPLICATION_OCTET_STREAM_VALUE;
        }
    }
}
