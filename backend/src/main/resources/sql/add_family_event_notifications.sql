CREATE TABLE IF NOT EXISTS family_event_subscription (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    openid VARCHAR(64) NOT NULL COMMENT '微信 openid 快照',
    template_id VARCHAR(128) NOT NULL COMMENT '订阅模板ID',
    subscribe_status VARCHAR(32) NOT NULL DEFAULT 'NONE' COMMENT '订阅状态',
    accept_source VARCHAR(32) DEFAULT NULL COMMENT '授权入口',
    accepted_at DATETIME DEFAULT NULL COMMENT '最后一次接受订阅时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_family_event_subscription_user_template (user_id, template_id),
    KEY idx_family_event_subscription_status (template_id, subscribe_status),
    KEY idx_family_event_subscription_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='家族大事订阅状态表';

CREATE TABLE IF NOT EXISTS family_event_notification (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    creator_id BIGINT NOT NULL COMMENT '发布管理员ID',
    template_key VARCHAR(32) DEFAULT NULL COMMENT '模板路由Key',
    template_id VARCHAR(128) DEFAULT NULL COMMENT '发送模板ID',
    event_type VARCHAR(32) NOT NULL COMMENT '事件类型',
    member_name VARCHAR(64) NOT NULL COMMENT '相关成员',
    event_time VARCHAR(64) NOT NULL COMMENT '时间文本',
    location VARCHAR(128) NOT NULL COMMENT '地点或摘要',
    remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' COMMENT '通知状态',
    recipient_count INT NOT NULL DEFAULT 0 COMMENT '收件人数',
    success_count INT NOT NULL DEFAULT 0 COMMENT '成功数',
    failure_count INT NOT NULL DEFAULT 0 COMMENT '失败数',
    last_sent_at DATETIME DEFAULT NULL COMMENT '最后发送时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    KEY idx_family_event_notification_status (status, created_at),
    KEY idx_family_event_notification_creator (creator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='家族大事通知主表';

CREATE TABLE IF NOT EXISTS family_event_notification_delivery (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    notification_id BIGINT NOT NULL COMMENT '通知ID',
    user_id BIGINT NOT NULL COMMENT '收件用户ID',
    openid VARCHAR(64) NOT NULL COMMENT '发送时 openid',
    template_id VARCHAR(128) NOT NULL COMMENT '订阅模板ID',
    send_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' COMMENT '发送状态',
    error_code INT DEFAULT NULL COMMENT '微信错误码',
    error_message VARCHAR(255) DEFAULT NULL COMMENT '微信错误信息',
    msg_id VARCHAR(64) DEFAULT NULL COMMENT '微信消息ID',
    sent_at DATETIME DEFAULT NULL COMMENT '发送时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_family_event_delivery_notification_user (notification_id, user_id),
    KEY idx_family_event_delivery_notification (notification_id),
    KEY idx_family_event_delivery_status (send_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='家族大事通知发送明细表';
