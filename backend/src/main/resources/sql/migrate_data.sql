-- 数据迁移脚本：从 family_member 到 family_members
-- 执行此脚本前请先执行 complete_schema.sql

USE family_tree;

-- 1. 创建一个默认家族（用于迁移旧数据）
INSERT INTO families (name, surname, origin_place, description, creator_id, status)
SELECT 
    '默认家族',
    '张',
    '未知',
    '系统自动创建的默认家族，用于迁移历史数据',
    1,  -- 超级管理员ID
    1
WHERE NOT EXISTS (SELECT 1 FROM families WHERE name = '默认家族');

-- 获取默认家族ID
SET @default_family_id = (SELECT id FROM families WHERE name = '默认家族' LIMIT 1);

-- 2. 迁移 family_member 数据到 family_members
INSERT INTO family_members (
    family_id,
    name,
    gender,
    birth_date,
    death_date,
    is_alive,
    id_card,
    phone,
    occupation,
    workplace,
    current_address,
    father_id,
    mother_id,
    avatar_url,
    introduction,
    sort_order,
    created_at,
    updated_at
)
SELECT 
    @default_family_id,
    name,
    gender,
    birth_date,
    death_date,
    is_alive,
    id_card,
    phone,
    occupation,
    workplace,
    current_address,
    father_id,
    mother_id,
    avatar_url,
    introduction,
    sort_order,
    create_time,
    update_time
FROM family_member
WHERE deleted = 0;

-- 3. 更新家族成员数量
UPDATE families 
SET member_count = (SELECT COUNT(*) FROM family_members WHERE family_id = @default_family_id AND deleted = 0)
WHERE id = @default_family_id;

-- 4. 备份完成后，可以选择删除旧表（慎重！）
-- DROP TABLE IF EXISTS family_member;

SELECT '数据迁移完成！' as message,
       (SELECT COUNT(*) FROM family_members WHERE family_id = @default_family_id) as migrated_count;
