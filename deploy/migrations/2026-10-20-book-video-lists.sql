-- 书单 / 播单：把原来的收藏迁移成默认的「我的收藏」列表
-- 已有库需要手工执行；新库由 mysql-init/02_book_db.sql / 04_video_db.sql 直接建好。

USE `book_db`;

CREATE TABLE IF NOT EXISTS `book_list` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `user_id` varchar(20) NOT NULL,
    `name` varchar(100) NOT NULL,
    `description` varchar(500) DEFAULT NULL,
    `create_time` datetime NOT NULL,
    `update_time` datetime NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_book_list_user_name` (`user_id`,`name`),
    KEY `idx_book_list_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `book_list_item` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `list_id` bigint NOT NULL,
    `book_id` int NOT NULL,
    `create_time` datetime NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_book_list_book` (`list_id`,`book_id`),
    KEY `idx_book_list_item_book` (`book_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `book_list` (`user_id`, `name`, `description`, `create_time`, `update_time`)
SELECT `user_id`, '我的收藏', '由原收藏迁移', NOW(), NOW()
FROM `book_favorite`
GROUP BY `user_id`;

INSERT IGNORE INTO `book_list_item` (`list_id`, `book_id`, `create_time`)
SELECT l.`id`, f.`book_id`, COALESCE(MIN(f.`create_time`), NOW())
FROM `book_favorite` f
JOIN `book_list` l ON l.`user_id` = f.`user_id` AND l.`name` = '我的收藏'
GROUP BY l.`id`, f.`book_id`;

USE `video_db`;

CREATE TABLE IF NOT EXISTS `video_list` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `user_id` varchar(20) NOT NULL,
    `name` varchar(100) NOT NULL,
    `description` varchar(500) DEFAULT NULL,
    `create_time` datetime NOT NULL,
    `update_time` datetime NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_video_list_user_name` (`user_id`,`name`),
    KEY `idx_video_list_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `video_list_item` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `list_id` bigint NOT NULL,
    `movie_id` bigint NOT NULL,
    `create_time` datetime NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_video_list_movie` (`list_id`,`movie_id`),
    KEY `idx_video_list_item_movie` (`movie_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `video_list` (`user_id`, `name`, `description`, `create_time`, `update_time`)
SELECT `user_id`, '我的收藏', '由原收藏迁移', NOW(), NOW()
FROM `favorite`
GROUP BY `user_id`;

INSERT IGNORE INTO `video_list_item` (`list_id`, `movie_id`, `create_time`)
SELECT l.`id`, f.`movie_id`, COALESCE(MIN(f.`create_time`), NOW())
FROM `favorite` f
JOIN `video_list` l ON l.`user_id` = f.`user_id` AND l.`name` = '我的收藏'
GROUP BY l.`id`, f.`movie_id`;
