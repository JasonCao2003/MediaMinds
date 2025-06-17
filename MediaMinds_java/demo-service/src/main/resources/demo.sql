CREATE TABLE demo_records
(
    demo_id    VARCHAR(12) PRIMARY KEY, -- 主键，12 位 UUID
    created_at DATETIME NOT NULL        -- 创建时间
);