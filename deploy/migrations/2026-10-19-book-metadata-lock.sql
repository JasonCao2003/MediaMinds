-- ============================================================================
--  图书元数据锁定（阶段 6）
--
--  锁定的书不参与「批量刷新元数据」与 BookDrop 的自动补全，
--  避免在线源/自动流程把手工整理过的内容冲掉。
--
--  适用：已经建过库的环境（全新环境由 mysql-init/02_book_db.sql 直接建好）。
--  执行：docker exec -i mm-mysql mysql --default-character-set=utf8mb4 -uroot -p123456 book_db < deploy/migrations/2026-10-19-book-metadata-lock.sql
--
--  幂等性：MySQL 不支持 ADD COLUMN IF NOT EXISTS，重复执行会报 Duplicate column name。
-- ============================================================================

ALTER TABLE `book`
    ADD COLUMN `metadata_locked` tinyint(1) NOT NULL DEFAULT '0'
        COMMENT '元数据锁定：锁定后不参与自动刷新' AFTER `series_number`;
