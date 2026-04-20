package com.familytree.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class LegacyFamilyMemberSchemaInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LegacyFamilyMemberSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public LegacyFamilyMemberSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (!tableExists("family_member")) {
                return;
            }

            ensureColumn("family_member", "spouse_name",
                    "ALTER TABLE family_member ADD COLUMN spouse_name VARCHAR(50) COMMENT '配偶姓名'");
            ensureColumn("family_member", "mother_name",
                    "ALTER TABLE family_member ADD COLUMN mother_name VARCHAR(50) COMMENT '母亲姓名'");
            ensureColumn("family_member", "is_external_spouse",
                    "ALTER TABLE family_member ADD COLUMN is_external_spouse TINYINT DEFAULT 0 COMMENT '是否为挂靠配偶：1-是，0-否'");
            ensureColumn("family_member", "user_id",
                    "ALTER TABLE family_member ADD COLUMN user_id BIGINT COMMENT '关联用户ID'");
            ensureColumn("family_member", "creator_id",
                    "ALTER TABLE family_member ADD COLUMN creator_id BIGINT COMMENT '创建者用户ID'");
            ensureColumn("family_member", "generation",
                    "ALTER TABLE family_member ADD COLUMN generation INT COMMENT '世代（第几代）'");
            ensureColumn("family_member", "audit_status",
                    "ALTER TABLE family_member ADD COLUMN audit_status TINYINT DEFAULT 1 COMMENT '审核状态：0-待审核，1-已通过，2-已拒绝'");
            ensureColumn("family_member", "auditor_id",
                    "ALTER TABLE family_member ADD COLUMN auditor_id BIGINT COMMENT '审核人ID'");
            ensureColumn("family_member", "audit_time",
                    "ALTER TABLE family_member ADD COLUMN audit_time DATETIME COMMENT '审核时间'");
            ensureColumn("family_member", "audit_remark",
                    "ALTER TABLE family_member ADD COLUMN audit_remark VARCHAR(500) COMMENT '审核备注'");

            jdbcTemplate.update("UPDATE family_member SET is_external_spouse = 0 WHERE is_external_spouse IS NULL");
            jdbcTemplate.update("UPDATE family_member SET audit_status = 1 WHERE audit_status IS NULL");
        } catch (Exception e) {
            log.error("Failed to align legacy family_member schema", e);
        }
    }

    private void ensureColumn(String tableName, String columnName, String alterSql) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                tableName,
                columnName
        );
        if (count != null && count > 0) {
            return;
        }
        jdbcTemplate.execute(alterSql);
        log.info("Added missing column {}.{} for legacy schema compatibility", tableName, columnName);
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }
}
