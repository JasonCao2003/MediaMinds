-- 创建数据库
CREATE DATABASE IF NOT EXISTS notification_db;

-- 选择数据库
USE notification_db;

-- 创建表
CREATE TABLE `notification`
(
    `notification_id` VARCHAR(12)  NOT NULL,                           -- 主键，UUID的前12位
    `user_id`         VARCHAR(12) NULL,                               -- 用户ID，允许为空，空值表示广播
    `type`            VARCHAR(12) NOT NULL,                           -- 通知类型
    `content`         TEXT         NOT NULL,                           -- 通知内容
    `read`            BOOLEAN               DEFAULT FALSE NOT NULL,    -- 是否已读，默认值为 false
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间，默认值为当前时间
    PRIMARY KEY (`notification_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

