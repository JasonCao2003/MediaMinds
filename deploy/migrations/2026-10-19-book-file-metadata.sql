-- ============================================================================
--  图书文件入库 + 元数据扩充
--
--  对应「图书入库」功能：用户上传 EPUB / PDF / CBZ，
--  服务端抽取元数据并转存 MinIO。
--
--  适用：已经建过库的环境（全新环境由 mysql-init/02_book_db.sql 直接建好，无需执行本文件）。
--  执行：docker exec -i mm-mysql mysql --default-character-set=utf8mb4 -uroot -p123456 book_db < deploy/migrations/2026-10-19-book-file-metadata.sql
--
--  幂等性：MySQL 不支持 ADD COLUMN IF NOT EXISTS，重复执行会报 Duplicate column name。
--  重复执行前请先确认列是否已存在（DESC book）。
-- ============================================================================

-- 文件相关
ALTER TABLE `book`
    ADD COLUMN `file_key`         varchar(255) DEFAULT NULL COMMENT 'MinIO 对象名（图书文件）' AFTER `source`,
    ADD COLUMN `file_format`      varchar(16)  DEFAULT NULL COMMENT '文件格式：epub/pdf/cbz'      AFTER `file_key`,
    ADD COLUMN `file_size`        bigint       DEFAULT NULL COMMENT '文件字节数'                  AFTER `file_format`,
    ADD COLUMN `file_name`        varchar(255) DEFAULT NULL COMMENT '上传时的原始文件名'          AFTER `file_size`,
    ADD COLUMN `file_uploaded_at` datetime     DEFAULT NULL COMMENT '文件上传时间'                AFTER `file_name`;

-- 元数据扩充（本地抽取 + 在线补全的落点）
ALTER TABLE `book`
    ADD COLUMN `subtitle`       varchar(255)  DEFAULT NULL COMMENT '副标题'      AFTER `file_uploaded_at`,
    ADD COLUMN `publisher`      varchar(255)  DEFAULT NULL COMMENT '出版社'      AFTER `subtitle`,
    ADD COLUMN `published_date` date          DEFAULT NULL COMMENT '出版日期'    AFTER `publisher`,
    ADD COLUMN `isbn13`         varchar(13)   DEFAULT NULL COMMENT 'ISBN-13'     AFTER `published_date`,
    ADD COLUMN `isbn10`         varchar(10)   DEFAULT NULL COMMENT 'ISBN-10'     AFTER `isbn13`,
    ADD COLUMN `page_count`     int           DEFAULT NULL COMMENT '页数'        AFTER `isbn10`,
    ADD COLUMN `language`       varchar(16)   DEFAULT NULL COMMENT '语言'        AFTER `page_count`,
    ADD COLUMN `rating`         decimal(3,1)  DEFAULT NULL COMMENT '评分'        AFTER `language`,
    ADD COLUMN `review_count`   int           DEFAULT NULL COMMENT '评价数'      AFTER `rating`,
    ADD COLUMN `series_name`    varchar(255)  DEFAULT NULL COMMENT '所属系列'    AFTER `review_count`,
    ADD COLUMN `series_number`  decimal(5,1)  DEFAULT NULL COMMENT '系列内序号'  AFTER `series_name`;

-- 作者从 varchar(20) 扩到 255：多作者用逗号分隔时会超长被截断
ALTER TABLE `book`
    MODIFY COLUMN `book_author` varchar(255) DEFAULT NULL COMMENT '书籍作者（多作者用逗号分隔）';
