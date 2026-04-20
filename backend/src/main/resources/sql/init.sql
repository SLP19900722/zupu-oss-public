-- 创建数据库
CREATE DATABASE IF NOT EXISTS family_tree CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE family_tree;

-- 家族成员表
CREATE TABLE IF NOT EXISTS family_member (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    gender TINYINT DEFAULT 1 COMMENT '性别：1-男，2-女',
    birth_date VARCHAR(20) COMMENT '出生日期',
    id_card VARCHAR(18) COMMENT '身份证号',
    phone VARCHAR(11) COMMENT '手机号',
    occupation VARCHAR(100) COMMENT '职业',
    workplace VARCHAR(200) COMMENT '工作单位',
    current_address VARCHAR(200) COMMENT '现居地',
    father_id BIGINT COMMENT '父亲ID',
    mother_id BIGINT COMMENT '母亲ID',
    spouse_id BIGINT COMMENT '配偶ID',
    spouse_name VARCHAR(50) COMMENT '配偶姓名',
    mother_name VARCHAR(50) COMMENT '母亲姓名',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    introduction TEXT COMMENT '简介',
    is_alive TINYINT DEFAULT 1 COMMENT '是否在世：1-在世，0-已故',
    death_date VARCHAR(20) COMMENT '死亡日期',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_external_spouse TINYINT DEFAULT 0 COMMENT '是否为挂靠配偶：1-是，0-否',
    user_id BIGINT COMMENT '关联用户ID',
    creator_id BIGINT COMMENT '创建者用户ID',
    generation INT COMMENT '世代（第几代）',
    audit_status TINYINT DEFAULT 1 COMMENT '审核状态：0-待审核，1-已通过，2-已拒绝',
    auditor_id BIGINT COMMENT '审核人ID',
    audit_time DATETIME COMMENT '审核时间',
    audit_remark VARCHAR(500) COMMENT '审核备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '删除标记：0-未删除，1-已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家族成员表';

-- 插入示例数据
INSERT INTO family_member (name, gender, birth_date, occupation, introduction) VALUES
('张国强', 1, '1950-03-15', '退休教师', '家族第一代，德高望重'),
('李秀英', 2, '1952-07-20', '退休医生', '张国强的妻子，慈祥和蔼'),
('张明', 1, '1975-11-08', '软件工程师', '张国强和李秀英的儿子'),
('王丽', 2, '1978-04-12', '教师', '张明的妻子'),
('张小明', 1, '2005-06-18', '学生', '张明和王丽的儿子'),
('张小红', 2, '2008-09-25', '学生', '张明和王丽的女儿');

-- 更新关系
UPDATE family_member SET 
    father_id = 1, mother_id = 2 
    WHERE id IN (3);

UPDATE family_member SET 
    father_id = 3 
    WHERE id IN (5, 6);
