package com.xupt.book.kugou;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.ThreadLocalRandom;

/**
 * 酷狗接入配置。
 * 登录态（token / dfid / userid）通过环境变量或配置注入，支持 kugou.* 覆盖：
 *   KUGOU_TOKEN / kugou.token
 *   KUGOU_USERID / kugou.userid
 *   KUGOU_DFID / kugou.dfid
 *   KUGOU_VIP_TOKEN / kugou.vip-token
 *   KUGOU_VIP_TYPE / kugou.vip-type
 */
@Component
public class KugouProperties {

    // ================= 身份标识（Lite 版） =================
    public static final String APP_ID = "3116";
    public static final String CLIENT_VER = "11440";
    public static final String VERSION = "11440";
    public static final String USER_AGENT =
            "Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi";

    // ================= 盐值 =================
    /** 通用签名盐 */
    public static final String LITE_SALT = "LnT6xpN3khm36zse0QzvmgTZ3waWdRSA";
    /** v5 播放链接 key 盐 */
    public static final String V5_KEY_SALT = "185672dd44712f60bb1736df5a377e82";
    /** Web 扫码登录签名盐 */
    public static final String WEB_SIGNATURE_SALT = "NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt";
    /** 正式版（Android）签名盐 */
    public static final String OFFICIAL_SALT = "OIlwieks28dk2k092lksi2UIkp";

    // ================= 登录加密常量 =================
    public static final String LITE_T1_KEY = "5e4ef500e9597fe004bd09a46d8add98";
    public static final String LITE_T1_IV = "04bd09a46d8add98";
    public static final String LITE_T2_KEY = "fd14b35e3f81af3817a20ae7adae7020";
    public static final String LITE_T2_IV = "17a20ae7adae7020";
    public static final String T2_FIXED_HASH = "0f607264fc6318a92b9e13c65db7cd3c";
    public static final String LITE_APP_KEY = "c24f74ca2820225badc01946dba4fdf7";
    public static final String LITE_APP_IV = "adc01946dba4fdf7";

    // ================= 可配置登录态 =================
    @Value("${kugou.token:${KUGOU_TOKEN:}}")
    private String token;

    @Value("${kugou.userid:${KUGOU_USERID:0}}")
    private String userId;

    @Value("${kugou.dfid:${KUGOU_DFID:-}}")
    private String dfid;

    @Value("${kugou.vip-token:${KUGOU_VIP_TOKEN:}}")
    private String vipToken;

    @Value("${kugou.vip-type:${KUGOU_VIP_TYPE:0}}")
    private String vipType;

    /** 导入本地库时是否把音频下载到 MinIO（false 则仅保存酷狗播放直链） */
    @Value("${kugou.import-download-audio:true}")
    private boolean importDownloadAudio;

    /** 下载音频超时（秒） */
    @Value("${kugou.download-timeout-seconds:120}")
    private int downloadTimeoutSeconds;

    // 设备指纹（进程内随机生成）
    private final String installGuid = randomHex(32);
    private final String installMac = randomHex(32);
    private final String installDev = randomHex(16);

    public String getToken() {
        return token == null ? "" : token.trim();
    }

    public String getUserId() {
        return (userId == null || userId.isBlank()) ? "0" : userId.trim();
    }

    public String getDfid() {
        return (dfid == null || dfid.isBlank()) ? "-" : dfid.trim();
    }

    public String getVipToken() {
        return vipToken == null ? "" : vipToken.trim();
    }

    public String getVipType() {
        return (vipType == null || vipType.isBlank()) ? "0" : vipType.trim();
    }

    public boolean isImportDownloadAudio() {
        return importDownloadAudio;
    }

    public int getDownloadTimeoutSeconds() {
        return downloadTimeoutSeconds;
    }

    public String getInstallGuid() {
        return installGuid;
    }

    public String getInstallMac() {
        return installMac;
    }

    public String getInstallDev() {
        return installDev;
    }

    private static String randomHex(int length) {
        String chars = "0123456789abcdef";
        StringBuilder sb = new StringBuilder(length);
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
