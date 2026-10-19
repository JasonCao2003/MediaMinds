-- ============================================================================
--  歌曲补充酷狗源信息（用于按需刷新播放直链）
--
--  背景：酷狗导出的直链带时效，过期后 song.url 就播不了；而原先没有存 hash，
--  无法重新取地址。这里补上 hash / album id，播放前按需刷新 url。
--
--  适用：已经建过库的环境（全新环境由 mysql-init/03_music_data.sql 直接建好）。
--  执行：docker exec -i mm-mysql mysql --default-character-set=utf8mb4 -uroot -p123456 music_data < deploy/migrations/2026-10-19-song-kugou-source.sql
--
--  幂等性：MySQL 不支持 ADD COLUMN IF NOT EXISTS，重复执行会报 Duplicate column name。
-- ============================================================================

ALTER TABLE `song`
    ADD COLUMN `kugou_hash`           varchar(64) DEFAULT NULL COMMENT '酷狗 hash（按需刷新播放直链）',
    ADD COLUMN `kugou_album_id`       varchar(64) DEFAULT NULL COMMENT '酷狗 album_id',
    ADD COLUMN `kugou_album_audio_id` varchar(64) DEFAULT NULL COMMENT '酷狗 album_audio_id',
    ADD COLUMN `source`               varchar(16) DEFAULT NULL COMMENT '数据来源：kugou / manual';
