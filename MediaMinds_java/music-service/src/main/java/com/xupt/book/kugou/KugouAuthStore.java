package com.xupt.book.kugou;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.xupt.book.Mapper.KugouAuthMapper;
import com.xupt.book.Pojo.KugouAuth;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 酷狗登录态持久化。
 *
 * <p>登录态原本只写进程内存，重启 music-service 就要重新登录。这里落一张单行表：
 * 启动时（{@link PostConstruct}）读回并灌进 {@link KugouProperties}，
 * 登录成功后 upsert 保存，从而长期保留。
 *
 * <p>注意：token 是明文存库，适合本机自用的个人媒体库；多人共用环境请自行加密。
 */
@Slf4j
@Component
public class KugouAuthStore {

    /** 单行表固定主键 */
    private static final int ROW_ID = 1;

    private final KugouAuthMapper authMapper;
    private final KugouProperties props;

    public KugouAuthStore(KugouAuthMapper authMapper, KugouProperties props) {
        this.authMapper = authMapper;
        this.props = props;
    }

    /** 启动时恢复登录态（表里没有或 token 为空则以环境变量配置为准） */
    @PostConstruct
    public void load() {
        try {
            KugouAuth auth = authMapper.selectById(ROW_ID);
            if (auth == null || auth.getToken() == null || auth.getToken().isBlank()) {
                return;
            }
            props.updateLoginState(auth.getToken(), auth.getUserid(), auth.getDfid(),
                    auth.getVipToken(), auth.getVipType());
            log.info("已从数据库恢复酷狗登录态（userid={}）", props.getUserId());
        } catch (Exception e) {
            log.warn("读取酷狗登录态失败（不影响启动）: {}", e.toString());
        }
    }

    /** 登录成功后保存 */
    public void save(String token, String userId, String dfid,
                     String vipToken, String vipType, String refreshToken) {
        if (token == null || token.isBlank()) {
            return;
        }
        try {
            KugouAuth auth = new KugouAuth();
            auth.setId(ROW_ID);
            auth.setToken(token);
            auth.setUserid(userId);
            auth.setDfid(dfid);
            auth.setVipToken(vipToken);
            auth.setVipType(vipType);
            auth.setRefreshToken(refreshToken);
            auth.setUpdateTime(LocalDateTime.now());

            if (authMapper.selectById(ROW_ID) == null) {
                authMapper.insert(auth);
            } else {
                authMapper.updateById(auth);
            }
        } catch (Exception e) {
            log.warn("保存酷狗登录态失败: {}", e.toString());
        }
    }

    /** 退出登录：清空内存与表里的登录态 */
    public void clear() {
        props.clearLoginState();
        try {
            LambdaUpdateWrapper<KugouAuth> update = new LambdaUpdateWrapper<>();
            update.eq(KugouAuth::getId, ROW_ID)
                    .set(KugouAuth::getToken, null)
                    .set(KugouAuth::getUserid, null)
                    .set(KugouAuth::getDfid, null)
                    .set(KugouAuth::getVipToken, null)
                    .set(KugouAuth::getVipType, null)
                    .set(KugouAuth::getRefreshToken, null)
                    .set(KugouAuth::getUpdateTime, LocalDateTime.now());
            authMapper.update(null, update);
        } catch (Exception e) {
            log.warn("清除酷狗登录态失败: {}", e.toString());
        }
    }
}
