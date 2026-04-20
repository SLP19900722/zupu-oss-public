USE family_tree;

-- 1. 清除旧家族成员表（主要测试数据）
DELETE FROM family_member;

-- 2. 清除家族用户关联表
DELETE FROM family_user_relation;

-- 3. 清除审核记录表
DELETE FROM audit_records;

-- 4. 清除操作日志表
DELETE FROM operation_logs;

-- 5. 清除家族成员表（新表）
DELETE FROM family_members;

-- 6. 清除家族表
DELETE FROM families;

-- 7. 清除测试用户（只保留ID为1的超级管理员）
DELETE FROM users WHERE id != 1;

-- 8. 重置自增ID
ALTER TABLE family_member AUTO_INCREMENT = 1;
ALTER TABLE families AUTO_INCREMENT = 1;
ALTER TABLE family_members AUTO_INCREMENT = 1;
ALTER TABLE family_user_relation AUTO_INCREMENT = 1;
ALTER TABLE audit_records AUTO_INCREMENT = 1;
ALTER TABLE operation_logs AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 2;

-- 9. 验证结果
SELECT '测试数据清除完成！' as message;
SELECT COUNT(*) as family_member_count FROM family_member;
SELECT COUNT(*) as family_count FROM families;
SELECT COUNT(*) as member_count FROM family_members;
SELECT COUNT(*) as user_count FROM users;
