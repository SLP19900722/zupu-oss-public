package com.familytree.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class FamilyEventSchemaInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FamilyEventSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public FamilyEventSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS family_event_subscription ("
                    + "id BIGINT PRIMARY KEY AUTO_INCREMENT,"
                    + "user_id BIGINT NOT NULL,"
                    + "openid VARCHAR(64) NOT NULL,"
                    + "template_id VARCHAR(128) NOT NULL,"
                    + "subscribe_status VARCHAR(32) NOT NULL DEFAULT 'NONE',"
                    + "accept_source VARCHAR(32) DEFAULT NULL,"
                    + "accepted_at DATETIME DEFAULT NULL,"
                    + "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"
                    + "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,"
                    + "deleted TINYINT NOT NULL DEFAULT 0,"
                    + "UNIQUE KEY uk_family_event_subscription_user_template (user_id, template_id),"
                    + "KEY idx_family_event_subscription_status (template_id, subscribe_status),"
                    + "KEY idx_family_event_subscription_openid (openid)"
                    + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS family_event_notification ("
                    + "id BIGINT PRIMARY KEY AUTO_INCREMENT,"
                    + "creator_id BIGINT NOT NULL,"
                    + "template_key VARCHAR(32) DEFAULT NULL,"
                    + "template_id VARCHAR(128) DEFAULT NULL,"
                    + "event_type VARCHAR(32) NOT NULL,"
                    + "member_name VARCHAR(64) NOT NULL,"
                    + "event_time VARCHAR(64) NOT NULL,"
                    + "location VARCHAR(128) NOT NULL,"
                    + "remark VARCHAR(255) DEFAULT NULL,"
                    + "status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',"
                    + "recipient_count INT NOT NULL DEFAULT 0,"
                    + "success_count INT NOT NULL DEFAULT 0,"
                    + "failure_count INT NOT NULL DEFAULT 0,"
                    + "last_sent_at DATETIME DEFAULT NULL,"
                    + "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"
                    + "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,"
                    + "deleted TINYINT NOT NULL DEFAULT 0,"
                    + "KEY idx_family_event_notification_status (status, created_at),"
                    + "KEY idx_family_event_notification_creator (creator_id)"
                    + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS family_event_notification_delivery ("
                    + "id BIGINT PRIMARY KEY AUTO_INCREMENT,"
                    + "notification_id BIGINT NOT NULL,"
                    + "user_id BIGINT NOT NULL,"
                    + "openid VARCHAR(64) NOT NULL,"
                    + "template_id VARCHAR(128) NOT NULL,"
                    + "send_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',"
                    + "error_code INT DEFAULT NULL,"
                    + "error_message VARCHAR(255) DEFAULT NULL,"
                    + "msg_id VARCHAR(64) DEFAULT NULL,"
                    + "sent_at DATETIME DEFAULT NULL,"
                    + "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"
                    + "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,"
                    + "UNIQUE KEY uk_family_event_delivery_notification_user (notification_id, user_id),"
                    + "KEY idx_family_event_delivery_notification (notification_id),"
                    + "KEY idx_family_event_delivery_status (send_status)"
                    + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

            ensureColumn("family_event_notification", "template_key",
                    "ALTER TABLE family_event_notification ADD COLUMN template_key VARCHAR(32) DEFAULT NULL COMMENT '模板路由Key'");
            ensureColumn("family_event_notification", "template_id",
                    "ALTER TABLE family_event_notification ADD COLUMN template_id VARCHAR(128) DEFAULT NULL COMMENT '发送使用的模板ID'");
        } catch (Exception e) {
            log.error("Failed to initialize family event notification tables", e);
        }
    }

    private void ensureColumn(String tableName, String columnName, String alterSql) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                        + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                tableName,
                columnName
        );
        if (count != null && count.intValue() > 0) {
            return;
        }
        jdbcTemplate.execute(alterSql);
        log.info("Added missing column {}.{} for family event schema", tableName, columnName);
    }
}
