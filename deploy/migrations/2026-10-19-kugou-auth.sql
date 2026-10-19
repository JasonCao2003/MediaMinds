-- ============================================================================
--  酷狗登录态持久化
--
--  原先登录态只写进程内存，重启 music-service 就要重新登录。这里落一张单行表，
--  启动时读回、登录后 upsert，实现长期保存。
--
--  适用：已经建过库的环境（全新环境由 mysql-init/03_music_data.sql 直接建好）。
--  执行：docker exec -i mm-mysql mysql --default-character-set=utf8mb4 -uroot -p123456 music_data < deploy/migrations/2026-10-19-kugou-auth.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS `kugou_auth` (
    `id`            tinyint      NOT NULL COMMENT '固定为 1（单行表）',
    `token`         varchar(255) DEFAULT NULL COMMENT '酷狗登录 token',
    `userid`        varchar(64)  DEFAULT NULL COMMENT '酷狗 userid',
    `dfid`          varchar(128) DEFAULT NULL COMMENT '设备指纹',
    `vip_token`     varchar(255) DEFAULT NULL COMMENT 'VIP token',
    `vip_type`      varchar(16)  DEFAULT NULL COMMENT 'VIP 类型',
    `refresh_token` varchar(255) DEFAULT NULL COMMENT '刷新 token（预留）',
    `update_time`   datetime     DEFAULT NULL COMMENT '最近更新',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='酷狗登录态（单行）';

INSERT INTO `kugou_auth` (`id`) VALUES (1)
ON DUPLICATE KEY UPDATE `id` = `id`;
