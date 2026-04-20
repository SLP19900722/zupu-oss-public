-- Community edition showcase schema
-- Generated locally from the runtime database structure
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS `family_tree_showcase` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `family_tree_showcase`;

DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ç®¡ç†å‘˜ID',
  `user_id` bigint(20) NOT NULL COMMENT 'å…³è”ç”¨æˆ·ID',
  `username` varchar(50) NOT NULL COMMENT 'ç®¡ç†å‘˜è´¦å·',
  `password` varchar(128) NOT NULL COMMENT 'å¯†ç ï¼ˆåŠ å¯†ï¼‰',
  `real_name` varchar(50) DEFAULT NULL COMMENT 'çœŸå®žå§“å',
  `role` tinyint(4) DEFAULT '1' COMMENT 'è§’è‰²ï¼š1-ç®¡ç†å‘˜ï¼Œ2-è¶…çº§ç®¡ç†å‘˜',
  `permissions` text COMMENT 'æƒé™åˆ—è¡¨ï¼ˆJSONï¼‰',
  `status` tinyint(4) DEFAULT '0' COMMENT 'çŠ¶æ€ï¼š0-æ­£å¸¸ï¼Œ1-ç¦ç”¨',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  `deleted` tinyint(4) DEFAULT '0' COMMENT 'åˆ é™¤æ ‡è®°',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `user_id` (`user_id`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ç®¡ç†å‘˜è¡¨';

DROP TABLE IF EXISTS `audit_records`;
CREATE TABLE `audit_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `family_id` bigint(20) DEFAULT '1',
  `user_id` bigint(20) DEFAULT NULL,
  `type` tinyint(4) DEFAULT NULL,
  `target_id` bigint(20) DEFAULT NULL COMMENT 'ç›®æ ‡IDï¼ˆæˆå‘˜IDç­‰ï¼‰',
  `content` text COMMENT 'ç”³è¯·å†…å®¹ï¼ˆJSONï¼‰',
  `status` tinyint(4) DEFAULT '0' COMMENT 'çŠ¶æ€ï¼š0-å¾…å®¡æ ¸ï¼Œ1-å·²é€šè¿‡ï¼Œ2-å·²æ‹’ç»',
  `auditor_id` bigint(20) DEFAULT NULL COMMENT 'å®¡æ ¸äººID',
  `audit_time` datetime DEFAULT NULL COMMENT 'å®¡æ ¸æ—¶é—´',
  `audit_remark` varchar(500) DEFAULT NULL COMMENT 'å®¡æ ¸å¤‡æ³¨',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `audit_type` tinyint(4) DEFAULT NULL COMMENT 'å®¡æ ¸ç±»åž‹',
  `target_type` varchar(50) DEFAULT NULL COMMENT 'ç›®æ ‡ç±»åž‹',
  `old_content` text COMMENT 'æ—§å†…å®¹',
  `submitter_id` bigint(20) DEFAULT NULL COMMENT 'æäº¤äººID',
  `audit_status` tinyint(4) DEFAULT '0' COMMENT 'å®¡æ ¸çŠ¶æ€',
  `submitted_at` datetime DEFAULT NULL COMMENT 'æäº¤æ—¶é—´',
  `audited_at` datetime DEFAULT NULL COMMENT 'å®¡æ ¸æ—¶é—´',
  `audit_result` varchar(500) DEFAULT NULL COMMENT 'å®¡æ ¸ç»“æžœ',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  `deleted` tinyint(4) DEFAULT '0' COMMENT 'åˆ é™¤æ ‡è®°',
  PRIMARY KEY (`id`),
  KEY `idx_family` (`family_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='å®¡æ ¸è®°å½•è¡¨';

DROP TABLE IF EXISTS `families`;
CREATE TABLE `families` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'å®¶æ—ID',
  `name` varchar(100) NOT NULL COMMENT 'å®¶æ—åç§°',
  `surname` varchar(20) NOT NULL COMMENT 'å§“æ°',
  `origin_place` varchar(200) DEFAULT NULL COMMENT 'ç¥–ç±åœ°',
  `founder_name` varchar(50) DEFAULT NULL COMMENT 'å§‹ç¥–å§“å',
  `founding_year` varchar(20) DEFAULT NULL COMMENT 'å»ºæ—å¹´ä»½',
  `description` text COMMENT 'å®¶æ—ç®€ä»‹',
  `cover_image` varchar(500) DEFAULT NULL COMMENT 'å°é¢å›¾ç‰‡',
  `creator_id` bigint(20) NOT NULL COMMENT 'åˆ›å»ºè€…ID',
  `status` tinyint(4) DEFAULT '1' COMMENT 'çŠ¶æ€ï¼š0-ç¦ç”¨ï¼Œ1-æ­£å¸¸',
  `member_count` int(11) DEFAULT '0' COMMENT 'æˆå‘˜æ•°é‡',
  `view_count` int(11) DEFAULT '0' COMMENT 'æµè§ˆæ¬¡æ•°',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  `deleted` tinyint(4) DEFAULT '0' COMMENT 'åˆ é™¤æ ‡è®°',
  PRIMARY KEY (`id`),
  KEY `idx_creator` (`creator_id`),
  KEY `idx_surname` (`surname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='å®¶æ—è¡¨';

DROP TABLE IF EXISTS `family_event_notification`;
CREATE TABLE `family_event_notification` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `creator_id` bigint(20) NOT NULL,
  `template_key` varchar(32) DEFAULT NULL,
  `template_id` varchar(128) DEFAULT NULL,
  `event_type` varchar(32) NOT NULL,
  `member_name` varchar(64) NOT NULL,
  `event_time` varchar(64) NOT NULL,
  `location` varchar(128) NOT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'DRAFT',
  `recipient_count` int(11) NOT NULL DEFAULT '0',
  `success_count` int(11) NOT NULL DEFAULT '0',
  `failure_count` int(11) NOT NULL DEFAULT '0',
  `last_sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_family_event_notification_status` (`status`,`created_at`),
  KEY `idx_family_event_notification_creator` (`creator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `family_event_notification_delivery`;
CREATE TABLE `family_event_notification_delivery` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `notification_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `openid` varchar(64) NOT NULL,
  `template_id` varchar(128) NOT NULL,
  `send_status` varchar(32) NOT NULL DEFAULT 'PENDING',
  `error_code` int(11) DEFAULT NULL,
  `error_message` varchar(255) DEFAULT NULL,
  `msg_id` varchar(64) DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_family_event_delivery_notification_user` (`notification_id`,`user_id`),
  KEY `idx_family_event_delivery_notification` (`notification_id`),
  KEY `idx_family_event_delivery_status` (`send_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `family_event_subscription`;
CREATE TABLE `family_event_subscription` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `openid` varchar(64) NOT NULL,
  `template_id` varchar(128) NOT NULL,
  `subscribe_status` varchar(32) NOT NULL DEFAULT 'NONE',
  `accept_source` varchar(32) DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_family_event_subscription_user_template` (`user_id`,`template_id`),
  KEY `idx_family_event_subscription_status` (`template_id`,`subscribe_status`),
  KEY `idx_family_event_subscription_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `family_member`;
CREATE TABLE `family_member` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ä¸»é”®ID',
  `name` varchar(50) NOT NULL COMMENT 'å§“å',
  `gender` tinyint(4) DEFAULT '1' COMMENT 'æ€§åˆ«ï¼š1-ç”·ï¼Œ2-å¥³',
  `birth_date` varchar(20) DEFAULT NULL COMMENT 'å‡ºç”Ÿæ—¥æœŸ',
  `id_card` varchar(18) DEFAULT NULL COMMENT 'èº«ä»½è¯å·',
  `phone` varchar(11) DEFAULT NULL COMMENT 'æ‰‹æœºå·',
  `occupation` varchar(100) DEFAULT NULL COMMENT 'èŒä¸š',
  `workplace` varchar(200) DEFAULT NULL COMMENT 'å·¥ä½œå•ä½',
  `current_address` varchar(200) DEFAULT NULL COMMENT 'çŽ°å±…åœ°',
  `father_id` bigint(20) DEFAULT NULL COMMENT 'çˆ¶äº²ID',
  `mother_id` bigint(20) DEFAULT NULL COMMENT 'æ¯äº²ID',
  `spouse_id` bigint(20) DEFAULT NULL COMMENT 'é…å¶ID',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT 'å¤´åƒURL',
  `introduction` text COMMENT 'ç®€ä»‹',
  `is_alive` tinyint(4) DEFAULT '1' COMMENT 'æ˜¯å¦åœ¨ä¸–ï¼š1-åœ¨ä¸–ï¼Œ0-å·²æ•…',
  `death_date` varchar(20) DEFAULT NULL COMMENT 'æ­»äº¡æ—¥æœŸ',
  `sort_order` int(11) DEFAULT '0' COMMENT 'æŽ’åº',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  `deleted` tinyint(4) DEFAULT '0' COMMENT 'åˆ é™¤æ ‡è®°ï¼š0-æœªåˆ é™¤ï¼Œ1-å·²åˆ é™¤',
  `user_id` bigint(20) DEFAULT NULL COMMENT 'å…³è”ç”¨æˆ·ID',
  `creator_id` bigint(20) DEFAULT NULL COMMENT 'åˆ›å»ºè€…ID',
  `generation` int(11) DEFAULT '1' COMMENT 'ä¸–ä»£ï¼ˆç¬¬å‡ ä»£ï¼‰',
  `audit_status` tinyint(4) DEFAULT '0' COMMENT 'å®¡æ ¸çŠ¶æ€ï¼š0-å¾…å®¡æ ¸ï¼Œ1-å·²é€šè¿‡ï¼Œ2-å·²æ‹’ç»',
  `auditor_id` bigint(20) DEFAULT NULL COMMENT 'å®¡æ ¸äººID',
  `audit_time` datetime DEFAULT NULL COMMENT 'å®¡æ ¸æ—¶é—´',
  `audit_remark` varchar(500) DEFAULT NULL COMMENT 'å®¡æ ¸å¤‡æ³¨',
  `spouse_name` varchar(50) DEFAULT NULL COMMENT '配偶姓名',
  `mother_name` varchar(50) DEFAULT NULL COMMENT '母亲姓名',
  `is_external_spouse` tinyint(4) DEFAULT '0' COMMENT '是否为挂靠配偶：1-是，0-否',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_creator_id` (`creator_id`),
  KEY `idx_audit_status` (`audit_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='å®¶æ—æˆå‘˜è¡¨';

DROP TABLE IF EXISTS `family_tree_relations`;
CREATE TABLE `family_tree_relations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'å…³ç³»ID',
  `member_id` bigint(20) NOT NULL COMMENT 'æˆå‘˜ID',
  `ancestor_id` bigint(20) NOT NULL COMMENT 'ç¥–å…ˆID',
  `generation_gap` int(11) NOT NULL COMMENT 'ä¸–ä»£å·®è·',
  `relation_type` varchar(20) NOT NULL COMMENT 'å…³ç³»ç±»åž‹ï¼šparent, grandparentç­‰',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  PRIMARY KEY (`id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_ancestor` (`ancestor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='å®¶æ—æ ‘å…³ç³»è¡¨';

DROP TABLE IF EXISTS `family_user_relation`;
CREATE TABLE `family_user_relation` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `family_id` bigint(20) NOT NULL COMMENT 'å®¶æ—ID',
  `user_id` bigint(20) NOT NULL COMMENT 'ç”¨æˆ·ID',
  `member_id` bigint(20) DEFAULT NULL COMMENT 'å¯¹åº”çš„å®¶æ—æˆå‘˜ID',
  `role` tinyint(4) DEFAULT '0' COMMENT 'è§’è‰²ï¼š0-æ™®é€šæˆå‘˜ï¼Œ1-ç®¡ç†å‘˜ï¼Œ2-å®¶ä¸»',
  `join_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åŠ å…¥æ—¶é—´',
  `status` tinyint(4) DEFAULT '1' COMMENT 'çŠ¶æ€ï¼š0-å¾…å®¡æ ¸ï¼Œ1-å·²é€šè¿‡ï¼Œ2-å·²æ‹’ç»',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_family_user` (`family_id`,`user_id`),
  KEY `idx_family` (`family_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='å®¶æ—æˆå‘˜å…³è”è¡¨';

DROP TABLE IF EXISTS `home_gallery_image`;
CREATE TABLE `home_gallery_image` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '??ID',
  `image_url` varchar(500) NOT NULL COMMENT '????',
  `thumb_url` varchar(500) DEFAULT NULL COMMENT '?????',
  `title` varchar(100) DEFAULT NULL COMMENT '????',
  `description` varchar(255) DEFAULT NULL COMMENT '????',
  `uploader_id` bigint(20) NOT NULL COMMENT '????ID',
  `uploader_role` tinyint(4) DEFAULT '0' COMMENT '??????0-?????1-????2-?????',
  `status` tinyint(4) DEFAULT '0' COMMENT '???0-????1-????2-???',
  `sort_order` int(11) DEFAULT '0' COMMENT '???',
  `reviewer_id` bigint(20) DEFAULT NULL COMMENT '???ID',
  `review_remark` varchar(255) DEFAULT NULL COMMENT '????',
  `reviewed_at` datetime DEFAULT NULL COMMENT '????',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  `deleted` tinyint(4) DEFAULT '0' COMMENT '??????',
  PRIMARY KEY (`id`),
  KEY `idx_gallery_status` (`status`),
  KEY `idx_gallery_uploader` (`uploader_id`),
  KEY `idx_gallery_sort` (`sort_order`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='???????';

DROP TABLE IF EXISTS `migration_timeline`;
CREATE TABLE `migration_timeline` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ä¸»é”®ID',
  `title` varchar(100) NOT NULL COMMENT 'äº‹ä»¶æ ‡é¢˜',
  `description` text COMMENT 'è¯¦ç»†æè¿°',
  `location` varchar(100) DEFAULT NULL COMMENT 'åœ°ç‚¹',
  `latitude` decimal(10,7) DEFAULT NULL COMMENT 'çº¬åº¦',
  `longitude` decimal(10,7) DEFAULT NULL COMMENT 'ç»åº¦',
  `year` int(11) DEFAULT NULL COMMENT 'å¹´ä»½',
  `dynasty` varchar(50) DEFAULT NULL COMMENT 'æœä»£',
  `generation` int(11) DEFAULT NULL COMMENT 'ç¬¬å‡ ä»£',
  `key_person` varchar(100) DEFAULT NULL COMMENT 'å…³é”®äººç‰©',
  `sort_order` int(11) DEFAULT '0' COMMENT 'æŽ’åº',
  `icon` varchar(50) DEFAULT NULL COMMENT 'å›¾æ ‡ç±»åž‹',
  `color` varchar(50) DEFAULT NULL COMMENT 'é¢œè‰²',
  `image_url` varchar(500) DEFAULT NULL COMMENT 'é…å›¾URL',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='è¿å¾™æ—¶é—´è½´è¡¨';

DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint(20) DEFAULT NULL COMMENT 'æ“ä½œç”¨æˆ·ID',
  `family_id` bigint(20) DEFAULT NULL COMMENT 'å®¶æ—ID',
  `action` varchar(50) NOT NULL COMMENT 'æ“ä½œç±»åž‹',
  `target_type` varchar(50) DEFAULT NULL COMMENT 'ç›®æ ‡ç±»åž‹',
  `target_id` bigint(20) DEFAULT NULL COMMENT 'ç›®æ ‡ID',
  `content` text COMMENT 'æ“ä½œå†…å®¹',
  `ip` varchar(50) DEFAULT NULL COMMENT 'IPåœ°å€',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'æ“ä½œæ—¶é—´',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_family` (`family_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='æ“ä½œæ—¥å¿—è¡¨';

DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `config_key` varchar(100) NOT NULL COMMENT 'é…ç½®é”®',
  `config_value` text COMMENT 'é…ç½®å€¼',
  `description` varchar(500) DEFAULT NULL COMMENT 'é…ç½®è¯´æ˜Ž',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ç³»ç»Ÿé…ç½®è¡¨';

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ç”¨æˆ·ID',
  `openid` varchar(100) NOT NULL COMMENT 'å¾®ä¿¡openid',
  `unionid` varchar(100) DEFAULT NULL COMMENT 'å¾®ä¿¡unionid',
  `nick_name` varchar(50) DEFAULT NULL COMMENT 'æ˜µç§°',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT 'å¤´åƒURL',
  `gender` tinyint(4) DEFAULT '0' COMMENT 'æ€§åˆ«ï¼š0-æœªçŸ¥ï¼Œ1-ç”·ï¼Œ2-å¥³',
  `phone` varchar(11) DEFAULT NULL COMMENT 'æ‰‹æœºå·',
  `email` varchar(100) DEFAULT NULL COMMENT 'é‚®ç®±',
  `real_name` varchar(50) DEFAULT NULL COMMENT 'çœŸå®žå§“å',
  `id_card` varchar(18) DEFAULT NULL COMMENT 'èº«ä»½è¯å·',
  `preferred_member_id` bigint(20) DEFAULT NULL COMMENT '用户绑定的成员ID',
  `status` tinyint(4) DEFAULT '0' COMMENT 'çŠ¶æ€ï¼š0-æ­£å¸¸ï¼Œ1-ç¦ç”¨',
  `role` tinyint(4) DEFAULT '0' COMMENT 'è§’è‰²ï¼š0-æ™®é€šç”¨æˆ·ï¼Œ1-å®¶æ—ç®¡ç†å‘˜ï¼Œ2-è¶…çº§ç®¡ç†å‘˜',
  `last_login_time` datetime DEFAULT NULL COMMENT 'æœ€åŽç™»å½•æ—¶é—´',
  `last_login_ip` varchar(50) DEFAULT NULL COMMENT 'æœ€åŽç™»å½•IP',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  `deleted` tinyint(4) DEFAULT '0' COMMENT 'åˆ é™¤æ ‡è®°ï¼š0-æœªåˆ é™¤ï¼Œ1-å·²åˆ é™¤',
  PRIMARY KEY (`id`),
  UNIQUE KEY `openid` (`openid`),
  KEY `idx_openid` (`openid`),
  KEY `idx_phone` (`phone`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`),
  KEY `idx_preferred_member` (`preferred_member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ç”¨æˆ·è¡¨';

DROP VIEW IF EXISTS `v_family_members_with_audit`;
CREATE OR REPLACE VIEW `v_family_members_with_audit` AS
SELECT
  fm.id,
  fm.name,
  fm.gender,
  fm.birth_date,
  fm.id_card,
  fm.phone,
  fm.occupation,
  fm.workplace,
  fm.current_address,
  fm.father_id,
  fm.mother_id,
  fm.spouse_id,
  fm.avatar_url,
  fm.introduction,
  fm.is_alive,
  fm.death_date,
  fm.sort_order,
  fm.create_time,
  fm.update_time,
  fm.deleted,
  fm.user_id,
  fm.creator_id,
  fm.generation,
  fm.audit_status,
  fm.auditor_id,
  fm.audit_time,
  fm.audit_remark,
  u.nick_name AS creator_name,
  au.real_name AS auditor_name,
  CASE fm.audit_status
    WHEN 0 THEN '待审核'
    WHEN 1 THEN '已通过'
    WHEN 2 THEN '已拒绝'
    ELSE '未知'
  END AS audit_status_text
FROM family_member fm
LEFT JOIN users u ON fm.creator_id = u.id
LEFT JOIN users au ON fm.auditor_id = au.id
WHERE fm.deleted = 0;
