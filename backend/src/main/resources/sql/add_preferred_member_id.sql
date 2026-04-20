-- 为 users 表增加“用户绑定成员ID”字段
USE family_tree;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_member_id BIGINT NULL COMMENT '用户绑定的成员ID' AFTER id_card;
