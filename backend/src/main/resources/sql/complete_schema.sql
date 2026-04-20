-- 族谱系统完整数据库结构
-- 创建时间: 2026-02-09

USE family_tree;

-- =====================================================
-- 1. 用户表 (users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    openid VARCHAR(100) UNIQUE NOT NULL COMMENT '微信openid',
    unionid VARCHAR(100) COMMENT '微信unionid',
    nick_name VARCHAR(50) COMMENT '昵称',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    gender TINYINT DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
    phone VARCHAR(11) COMMENT '手机号',
    email VARCHAR(100) COMMENT '邮箱',
    real_name VARCHAR(50) COMMENT '真实姓名',
    id_card VARCHAR(18) COMMENT '身份证号',
    preferred_member_id BIGINT COMMENT '用户绑定的成员ID',
    status TINYINT DEFAULT 0 COMMENT '状态：0-正常，1-禁用',
    role TINYINT DEFAULT 0 COMMENT '角色：0-普通用户，1-家族管理员，2-超级管理员',
    last_login_time DATETIME COMMENT '最后登录时间',
    last_login_ip VARCHAR(50) COMMENT '最后登录IP',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '删除标记：0-未删除，1-已删除',
    INDEX idx_openid (openid),
    INDEX idx_phone (phone),
    INDEX idx_preferred_member (preferred_member_id),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- =====================================================
-- 2. 家族表 (families)
-- =====================================================
CREATE TABLE IF NOT EXISTS families (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '家族ID',
    name VARCHAR(100) NOT NULL COMMENT '家族名称',
    surname VARCHAR(20) NOT NULL COMMENT '姓氏',
    origin_place VARCHAR(200) COMMENT '祖籍地',
    founder_name VARCHAR(50) COMMENT '始祖姓名',
    founding_year VARCHAR(20) COMMENT '建族年份',
    description TEXT COMMENT '家族简介',
    cover_image VARCHAR(500) COMMENT '封面图片',
    creator_id BIGINT NOT NULL COMMENT '创建者ID',
    status TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
    member_count INT DEFAULT 0 COMMENT '成员数量',
    view_count INT DEFAULT 0 COMMENT '浏览次数',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '删除标记',
    INDEX idx_creator (creator_id),
    INDEX idx_surname (surname),
    FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家族表';

-- =====================================================
-- 3. 家族成员关联表 (family_user_relation)
-- =====================================================
CREATE TABLE IF NOT EXISTS family_user_relation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    family_id BIGINT NOT NULL COMMENT '家族ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    member_id BIGINT COMMENT '对应的家族成员ID',
    role TINYINT DEFAULT 0 COMMENT '角色：0-普通成员，1-管理员，2-家主',
    join_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    status TINYINT DEFAULT 1 COMMENT '状态：0-待审核，1-已通过，2-已拒绝',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_family_user (family_id, user_id),
    INDEX idx_family (family_id),
    INDEX idx_user (user_id),
    INDEX idx_member (member_id),
    FOREIGN KEY (family_id) REFERENCES families(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家族成员关联表';

-- =====================================================
-- 4. 家族成员表 (family_members) - 修改原表
-- =====================================================
-- 删除旧表，重新创建
DROP TABLE IF EXISTS family_member;

CREATE TABLE IF NOT EXISTS family_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    family_id BIGINT NOT NULL COMMENT '所属家族ID',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    gender TINYINT DEFAULT 1 COMMENT '性别：1-男，2-女',
    generation INT COMMENT '世代（第几代）',
    birth_date VARCHAR(20) COMMENT '出生日期',
    death_date VARCHAR(20) COMMENT '去世日期',
    is_alive TINYINT DEFAULT 1 COMMENT '是否在世：1-在世，0-已故',
    id_card VARCHAR(18) COMMENT '身份证号',
    phone VARCHAR(11) COMMENT '手机号',
    occupation VARCHAR(100) COMMENT '职业',
    workplace VARCHAR(200) COMMENT '工作单位',
    education VARCHAR(50) COMMENT '学历',
    current_address VARCHAR(200) COMMENT '现居地',
    birthplace VARCHAR(200) COMMENT '出生地',
    father_id BIGINT COMMENT '父亲ID',
    mother_id BIGINT COMMENT '母亲ID',
    spouse_ids VARCHAR(500) COMMENT '配偶ID列表（JSON数组）',
    avatar_url VARCHAR(500) COMMENT '头像URL',
    photos VARCHAR(2000) COMMENT '照片列表（JSON数组）',
    introduction TEXT COMMENT '个人简介',
    achievements TEXT COMMENT '主要成就',
    creator_id BIGINT COMMENT '创建者用户ID',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '删除标记',
    INDEX idx_family (family_id),
    INDEX idx_father (father_id),
    INDEX idx_mother (mother_id),
    INDEX idx_generation (generation),
    INDEX idx_creator (creator_id),
    FOREIGN KEY (family_id) REFERENCES families(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家族成员信息表';

-- =====================================================
-- 5. 审核记录表 (audit_records)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    family_id BIGINT NOT NULL COMMENT '家族ID',
    user_id BIGINT NOT NULL COMMENT '申请用户ID',
    type TINYINT NOT NULL COMMENT '审核类型：1-加入家族，2-添加成员，3-修改成员',
    target_id BIGINT COMMENT '目标ID（成员ID等）',
    content TEXT COMMENT '申请内容（JSON）',
    status TINYINT DEFAULT 0 COMMENT '状态：0-待审核，1-已通过，2-已拒绝',
    auditor_id BIGINT COMMENT '审核人ID',
    audit_time DATETIME COMMENT '审核时间',
    audit_remark VARCHAR(500) COMMENT '审核备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_family (family_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    FOREIGN KEY (family_id) REFERENCES families(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核记录表';

-- =====================================================
-- 6. 操作日志表 (operation_logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS operation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    user_id BIGINT COMMENT '操作用户ID',
    family_id BIGINT COMMENT '家族ID',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    target_type VARCHAR(50) COMMENT '目标类型',
    target_id BIGINT COMMENT '目标ID',
    content TEXT COMMENT '操作内容',
    ip VARCHAR(50) COMMENT 'IP地址',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_user (user_id),
    INDEX idx_family (family_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- =====================================================
-- 7. 系统配置表 (system_config)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(500) COMMENT '配置说明',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- =====================================================
-- 8. 首页家族影像表 (home_gallery_image)
-- =====================================================
CREATE TABLE IF NOT EXISTS home_gallery_image (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    image_url VARCHAR(500) NOT NULL COMMENT '图片地址',
    thumb_url VARCHAR(500) COMMENT '缩略图地址',
    title VARCHAR(100) COMMENT '图片标题',
    description VARCHAR(255) COMMENT '图片描述',
    uploader_id BIGINT NOT NULL COMMENT '上传用户ID',
    uploader_role TINYINT DEFAULT 0 COMMENT '上传者角色：0-普通成员，1-管理员，2-超级管理员',
    status TINYINT DEFAULT 0 COMMENT '状态：0-待审核，1-已发布，2-已拒绝',
    sort_order INT DEFAULT 0 COMMENT '排序值',
    reviewer_id BIGINT COMMENT '审核人ID',
    review_remark VARCHAR(255) COMMENT '审核备注',
    reviewed_at DATETIME COMMENT '审核时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标记',
    INDEX idx_gallery_status (status),
    INDEX idx_gallery_uploader (uploader_id),
    INDEX idx_gallery_sort (sort_order, created_at),
    FOREIGN KEY (uploader_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页家族影像表';

-- =====================================================
-- 初始化数据
-- =====================================================

-- 插入超级管理员（需要替换真实的openid）
INSERT INTO users (openid, nick_name, real_name, role, status) VALUES
('SUPER_ADMIN_OPENID', '系统管理员', '管理员', 2, 0);

-- 插入系统配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('wechat.app_id', 'your-wechat-app-id', '微信小程序AppID'),
('wechat.app_secret', 'your-wechat-secret', '微信小程序Secret'),
('audit.required', 'true', '是否需要审核'),
('member.max_per_family', '1000', '每个家族最大成员数'),
('jwt.secret', 'familytree-jwt-secret-key-2023', 'JWT密钥'),
('jwt.expiration', '604800000', 'JWT过期时间（毫秒）');

-- =====================================================
-- 数据迁移：将旧的 family_member 数据迁移到新表
-- =====================================================
-- 注意：执行前需要先创建一个默认家族
