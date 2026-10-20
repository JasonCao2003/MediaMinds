-- 影视第三方播放平台：记录 TMDB 影片 ID，供 watch/providers 查询
-- 已有库需要手工执行；新库由 mysql-init/04_video_db.sql 直接建好。
USE `video_db`;

ALTER TABLE `movie`
    ADD COLUMN `tmdb_id` bigint DEFAULT NULL COMMENT 'TMDB 影片 ID（第三方播放平台查询用）' AFTER `source`;

CREATE INDEX `idx_movie_tmdb_id` ON `movie` (`tmdb_id`);
