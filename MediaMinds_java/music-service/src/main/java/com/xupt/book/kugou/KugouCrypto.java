package com.xupt.book.kugou;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.zip.Inflater;

/**
 * 酷狗签名与加解密工具（对齐参考项目 KuGou.Net 的 KGSigner / KGCrypto / KGUtils）。
 */
public final class KugouCrypto {

    /** Lite 版公开 RSA 公钥（用于登录 pk 加密） */
    private static final String PUBLIC_LITE_RSA_KEY =
            "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDECi0Np2UR87scwrvTr72L6oO01rBbbBPriSDFPxr3"
                    + "Z5syug0O24QyQO8bg27+0+4kBzTBTBOZ/WWU0WryL1JSXRTXLgFVxtzIY41Pe7lPOgsfTCn5kZcvKhYKJes"
                    + "KnnJDNr5/abvTGf+rHG3YRwsCHcQ08/q6ifSioBszvb3QiwIDAQAB";

    private KugouCrypto() {
    }

    // ================= 基础 =================

    public static String md5(String input) {
        if (input == null || input.isEmpty()) {
            return "";
        }
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("MD5 计算失败", e);
        }
    }

    public static String randomString(int length) {
        String chars = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        StringBuilder sb = new StringBuilder(length);
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }
        return sb.toString();
    }

    /** 由设备指纹计算 mid（十进制字符串） */
    public static String calcNewMid(String guid) {
        String md5Hex = md5(guid == null ? "" : guid);
        if (md5Hex.isEmpty()) {
            return "0";
        }
        return new BigInteger(md5Hex, 16).toString();
    }

    private static String buildSorted(Map<String, String> params) {
        TreeMap<String, String> sorted = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> e : sorted.entrySet()) {
            sb.append(e.getKey()).append('=').append(e.getValue());
        }
        return sb.toString();
    }

    // ================= 签名 =================

    /** 常规签名：md5(salt + 排序参数拼接 + jsonBody + salt) */
    public static String defaultSignature(Map<String, String> params, String jsonBody) {
        String body = jsonBody == null ? "" : jsonBody;
        return md5(KugouProperties.LITE_SALT + buildSorted(params) + body + KugouProperties.LITE_SALT);
    }

    /** Web 签名（扫码登录等）：md5(webSalt + 排序参数拼接 + webSalt) */
    public static String webSignature(Map<String, String> params) {
        return md5(KugouProperties.WEB_SIGNATURE_SALT + buildSorted(params)
                + KugouProperties.WEB_SIGNATURE_SALT);
    }

    /** v5 播放链接 key：md5(hash + salt + appId + mid + userid) */
    public static String v5Key(String hash, String userId, String mid) {
        return md5((hash == null ? "" : hash) + KugouProperties.V5_KEY_SALT
                + KugouProperties.APP_ID + mid + userId);
    }

    /** 登录 key：md5(appId + salt + clientVer + clienttimeMs) */
    public static String loginKey(long clientTimeMs) {
        return md5(KugouProperties.APP_ID + KugouProperties.LITE_SALT
                + KugouProperties.CLIENT_VER + clientTimeMs);
    }

    // ================= AES =================

    /** AES-CBC/PKCS7（显式 key/iv），返回小写 Hex */
    public static String aesEncryptHex(String data, String key, String iv) {
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            SecretKeySpec keySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "AES");
            IvParameterSpec ivSpec = new IvParameterSpec(iv.getBytes(StandardCharsets.UTF_8));
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
            byte[] out = cipher.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return toHex(out);
        } catch (Exception e) {
            throw new IllegalStateException("AES 加密失败", e);
        }
    }

    /** AES-CBC/PKCS7（随机 key，key/iv 由 md5(key) 推导），返回 (密文Hex, 明文key) */
    public static String[] aesEncryptRandom(String data) {
        String key = randomString(16).toLowerCase();
        String md5Key = md5(key);
        String actualKey = md5Key;
        String actualIv = md5Key.substring(md5Key.length() - 16);
        return new String[]{aesEncryptHex(data, actualKey, actualIv), key};
    }

    /** AES-CBC/PKCS7（key/iv 由 md5(key) 推导）解密 Hex 密文 */
    public static String aesDecryptHex(String hexData, String key) {
        try {
            String actualKey = md5(key);
            String actualIv = actualKey.substring(actualKey.length() - 16);
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            SecretKeySpec keySpec = new SecretKeySpec(actualKey.getBytes(StandardCharsets.UTF_8), "AES");
            IvParameterSpec ivSpec = new IvParameterSpec(actualIv.getBytes(StandardCharsets.UTF_8));
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
            byte[] out = cipher.doFinal(fromHex(hexData));
            return new String(out, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("AES 解密失败", e);
        }
    }

    // ================= RSA =================

    /** RSA 无填充加密（Lite 公钥），返回大写 Hex */
    public static String rsaEncryptNoPaddingUpper(String data) {
        try {
            byte[] keyBytes = Base64.getDecoder().decode(PUBLIC_LITE_RSA_KEY);
            PublicKey publicKey = KeyFactory.getInstance("RSA")
                    .generatePublic(new X509EncodedKeySpec(keyBytes));
            java.security.interfaces.RSAPublicKey rsaKey =
                    (java.security.interfaces.RSAPublicKey) publicKey;

            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] padded = new byte[128];
            int copyLen = Math.min(dataBytes.length, 128);
            System.arraycopy(dataBytes, 0, padded, 0, copyLen);

            BigInteger m = new BigInteger(1, padded);
            BigInteger c = m.modPow(rsaKey.getPublicExponent(), rsaKey.getModulus());

            byte[] raw = c.toByteArray();
            byte[] result = new byte[128];
            if (raw.length >= 128) {
                System.arraycopy(raw, raw.length - 128, result, 0, 128);
            } else {
                System.arraycopy(raw, 0, result, 128 - raw.length, raw.length);
            }
            return toHex(result).toUpperCase();
        } catch (Exception e) {
            throw new IllegalStateException("RSA 加密失败", e);
        }
    }

    // ================= KRC 歌词解码 =================

    private static final byte[] KRC_KEY = {
            64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, (byte) 206, (byte) 210, 110, 105
    };

    /** 解码酷狗 KRC 歌词（Base64 -> 异或 -> zlib 解压） */
    public static String decodeKrcLyrics(String base64Str) {
        if (base64Str == null || base64Str.isEmpty()) {
            return "";
        }
        try {
            byte[] bytes = Base64.getDecoder().decode(base64Str);
            if (bytes.length <= 4) {
                return "";
            }
            for (int i = 4; i < bytes.length; i++) {
                bytes[i] = (byte) (bytes[i] ^ KRC_KEY[(i - 4) % KRC_KEY.length]);
            }
            Inflater inflater = new Inflater();
            inflater.setInput(bytes, 4, bytes.length - 4);
            byte[] buffer = new byte[8192];
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            while (!inflater.finished()) {
                int n = inflater.inflate(buffer);
                if (n == 0 && inflater.needsInput()) {
                    break;
                }
                out.write(buffer, 0, n);
            }
            inflater.end();
            return out.toString(StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    // ================= Hex =================

    public static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }

    public static byte[] fromHex(String hex) {
        int len = hex.length();
        byte[] out = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            out[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                    + Character.digit(hex.charAt(i + 1), 16));
        }
        return out;
    }
}
