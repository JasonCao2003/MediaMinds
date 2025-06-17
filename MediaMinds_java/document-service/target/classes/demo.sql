drop database if exists document_db;
CREATE DATABASE document_db;
USE document_db;

-- 文档表
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY,                 -- 主键，UUID
    title VARCHAR(255) NOT NULL,                -- 文档标题
    description TEXT,                           -- 文档描述
    file_type VARCHAR(50) NOT NULL,             -- 文件类型（PDF, DOCX, XLSX, PPTX等）
    file_size BIGINT NOT NULL,                  -- 文件大小（字节）
    oss_path VARCHAR(500) NOT NULL,             -- 阿里云OSS存储路径
    oss_url VARCHAR(500) NOT NULL,              -- 阿里云OSS访问URL
    user_id VARCHAR(36) NOT NULL,               -- 创建者ID（关联auth-service的user表）
    folder_id VARCHAR(36),                      -- 所属文件夹ID
    version INT DEFAULT 1,                      -- 文档版本号
    is_deleted BOOLEAN DEFAULT FALSE,           -- 软删除标记
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- 创建时间
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 更新时间
    INDEX idx_user_id (user_id),
    INDEX idx_folder_id (folder_id)
);

-- 文件夹表
CREATE TABLE folders (
    id VARCHAR(36) PRIMARY KEY,                 -- 主键，UUID
    name VARCHAR(255) NOT NULL,                 -- 文件夹名称
    user_id VARCHAR(36) NOT NULL,               -- 创建者ID
    parent_id VARCHAR(36),                      -- 父文件夹ID，NULL表示根目录
    is_deleted BOOLEAN DEFAULT FALSE,           -- 软删除标记
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- 创建时间
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 更新时间
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id)
);

-- 文档版本历史表
CREATE TABLE document_versions (
    id VARCHAR(36) PRIMARY KEY,                 -- 主键，UUID
    document_id VARCHAR(36) NOT NULL,           -- 关联的文档ID
    version_number INT NOT NULL,                -- 版本号
    oss_path VARCHAR(500) NOT NULL,             -- 该版本文件的OSS存储路径
    oss_url VARCHAR(500) NOT NULL,              -- 该版本文件的OSS访问URL
    file_size BIGINT NOT NULL,                  -- 文件大小
    modified_by VARCHAR(36) NOT NULL,           -- 修改者ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- 创建时间
    INDEX idx_document_id (document_id)
);

-- 文档共享表
CREATE TABLE document_shares (
    id VARCHAR(36) PRIMARY KEY,                 -- 主键，UUID
    document_id VARCHAR(36) NOT NULL,           -- 关联的文档ID
    shared_with VARCHAR(36) NOT NULL,           -- 被共享用户ID
    permission_level VARCHAR(20) NOT NULL,      -- 权限级别（READ, EDIT, ADMIN）
    created_by VARCHAR(36) NOT NULL,            -- 共享创建者ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- 创建时间
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 更新时间
    INDEX idx_document_id (document_id),
    INDEX idx_shared_with (shared_with)
);

-- 文档标签表
CREATE TABLE tags (
    id VARCHAR(36) PRIMARY KEY,                 -- 主键，UUID
    name VARCHAR(100) NOT NULL,                 -- 标签名称
    user_id VARCHAR(36) NOT NULL,               -- 创建者ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- 创建时间
    UNIQUE KEY unique_tag_user (name, user_id)
);

-- 文档标签关联表
CREATE TABLE document_tags (
    document_id VARCHAR(36) NOT NULL,           -- 文档ID
    tag_id VARCHAR(36) NOT NULL,                -- 标签ID
    PRIMARY KEY (document_id, tag_id),
    INDEX idx_tag_id (tag_id)
);

-- 文档评论表
CREATE TABLE document_comments (
    id VARCHAR(36) PRIMARY KEY,                 -- 主键，UUID
    document_id VARCHAR(36) NOT NULL,           -- 文档ID
    user_id VARCHAR(36) NOT NULL,               -- 评论用户ID
    content TEXT NOT NULL,                      -- 评论内容
    parent_id VARCHAR(36),                      -- 父评论ID，用于回复功能
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- 创建时间
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 更新时间
    INDEX idx_document_id (document_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id)
);

-- 用户收藏表
CREATE TABLE user_favorites (
    user_id VARCHAR(36) NOT NULL,               -- 用户ID
    document_id VARCHAR(36) NOT NULL,           -- 文档ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- 创建时间
    PRIMARY KEY (user_id, document_id),
    INDEX idx_document_id (document_id)
);

-- 文档访问历史表
CREATE TABLE document_access_history (
    id VARCHAR(36) PRIMARY KEY,                 -- 主键，UUID
    document_id VARCHAR(36) NOT NULL,           -- 文档ID
    user_id VARCHAR(36) NOT NULL,               -- 访问用户ID
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- 访问时间
    access_type VARCHAR(20) NOT NULL,           -- 访问类型（VIEW, EDIT, DOWNLOAD）
    INDEX idx_document_id (document_id),
    INDEX idx_user_id (user_id),
    INDEX idx_access_time (access_time)
);
