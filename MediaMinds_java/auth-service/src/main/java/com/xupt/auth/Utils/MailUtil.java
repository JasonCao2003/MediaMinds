package com.xupt.auth.Utils;



import com.xupt.auth.DTO.Result;
import jakarta.validation.constraints.Email;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;


import java.util.Random;
import java.util.concurrent.TimeUnit;


// 邮箱类：用于发送邮件
@Component
public class MailUtil {

    @Autowired
    private JavaMailSender sender;
    @Autowired
    private StringRedisTemplate redisTemplate;

    public void SendMail(String to, String message) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setSubject("【媒体智库】验证码");
        mail.setText("您本次的验证码为 " + message + "，该验证码5分钟内有效，请勿泄露于他人。");
        mail.setTo(to);
        mail.setFrom("2764184496@qq.com");
        sender.send(mail);
    }

    public Result<?> SendValidation(@Email String email) {
        try {
            Random random = new Random();
            String code = String.valueOf(random.nextInt(9000) + 1000);
            SendMail(email, code);
            ValueOperations<String, String> operator = redisTemplate.opsForValue();
            operator.set(email, code, 300, TimeUnit.SECONDS);
            return Result.success("验证码发送成功");
        } catch (Exception e) {
            return Result.error(400,"验证码发送失败");
        }
    }
}
