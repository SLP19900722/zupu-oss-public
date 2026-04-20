USE family_tree;

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
    INDEX idx_gallery_sort (sort_order, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页家族影像表';
