-- 为 family_member 表补齐首次绑定和挂靠配偶所需字段

ALTER TABLE family_member
    ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(50) COMMENT '配偶姓名',
    ADD COLUMN IF NOT EXISTS mother_name VARCHAR(50) COMMENT '母亲姓名',
    ADD COLUMN IF NOT EXISTS is_external_spouse TINYINT DEFAULT 0 COMMENT '是否为挂靠配偶：1-是，0-否',
    ADD COLUMN IF NOT EXISTS user_id BIGINT COMMENT '关联用户ID',
    ADD COLUMN IF NOT EXISTS creator_id BIGINT COMMENT '创建者用户ID',
    ADD COLUMN IF NOT EXISTS generation INT COMMENT '世代（第几代）',
    ADD COLUMN IF NOT EXISTS audit_status TINYINT DEFAULT 1 COMMENT '审核状态：0-待审核，1-已通过，2-已拒绝',
    ADD COLUMN IF NOT EXISTS auditor_id BIGINT COMMENT '审核人ID',
    ADD COLUMN IF NOT EXISTS audit_time DATETIME COMMENT '审核时间',
    ADD COLUMN IF NOT EXISTS audit_remark VARCHAR(500) COMMENT '审核备注';

UPDATE family_member
SET is_external_spouse = 0
WHERE is_external_spouse IS NULL;

UPDATE family_member
SET audit_status = 1
WHERE audit_status IS NULL;
