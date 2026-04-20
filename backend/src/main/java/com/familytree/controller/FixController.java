package com.familytree.controller;

import com.familytree.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/fix")
@CrossOrigin(origins = "*")
public class FixController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostMapping("/encoding")
    public Result<String> fixEncoding() {
        try {
            List<Map<String, Object>> members = jdbcTemplate.queryForList(
                    "SELECT id, name, occupation, introduction, workplace, current_address, audit_remark "
                            + "FROM family_member WHERE deleted = 0"
            );

            int fixed = 0;
            for (Map<String, Object> member : members) {
                Long id = ((Number) member.get("id")).longValue();
                String name = (String) member.get("name");
                String occupation = (String) member.get("occupation");
                String introduction = (String) member.get("introduction");
                String workplace = (String) member.get("workplace");
                String currentAddress = (String) member.get("current_address");
                String auditRemark = (String) member.get("audit_remark");

                String fixedName = fixEncodingIfNeeded(name);
                String fixedOccupation = fixEncodingIfNeeded(occupation);
                String fixedIntroduction = fixEncodingIfNeeded(introduction);
                String fixedWorkplace = fixEncodingIfNeeded(workplace);
                String fixedCurrentAddress = fixEncodingIfNeeded(currentAddress);
                String fixedAuditRemark = fixEncodingIfNeeded(auditRemark);

                boolean changed = !equalsSafe(name, fixedName)
                        || !equalsSafe(occupation, fixedOccupation)
                        || !equalsSafe(introduction, fixedIntroduction)
                        || !equalsSafe(workplace, fixedWorkplace)
                        || !equalsSafe(currentAddress, fixedCurrentAddress)
                        || !equalsSafe(auditRemark, fixedAuditRemark);

                if (changed) {
                    jdbcTemplate.update(
                            "UPDATE family_member "
                                    + "SET name = ?, occupation = ?, introduction = ?, workplace = ?, current_address = ?, audit_remark = ? "
                                    + "WHERE id = ?",
                            fixedName,
                            fixedOccupation,
                            fixedIntroduction,
                            fixedWorkplace,
                            fixedCurrentAddress,
                            fixedAuditRemark,
                            id
                    );
                    fixed++;
                }
            }

            return Result.success("修复完成，共 " + fixed + " 条记录");
        } catch (Exception e) {
            return Result.error("修复失败: " + e.getMessage());
        }
    }

    @PostMapping("/encoding/sql")
    public Result<String> fixEncodingBySql() {
        try {
            int updated = jdbcTemplate.update(
                    "UPDATE family_member SET "
                            + "name = CONVERT(CAST(CONVERT(name USING latin1) AS BINARY) USING utf8mb4), "
                            + "occupation = CONVERT(CAST(CONVERT(occupation USING latin1) AS BINARY) USING utf8mb4), "
                            + "introduction = CONVERT(CAST(CONVERT(introduction USING latin1) AS BINARY) USING utf8mb4), "
                            + "workplace = CONVERT(CAST(CONVERT(workplace USING latin1) AS BINARY) USING utf8mb4), "
                            + "current_address = CONVERT(CAST(CONVERT(current_address USING latin1) AS BINARY) USING utf8mb4), "
                            + "audit_remark = CONVERT(CAST(CONVERT(audit_remark USING latin1) AS BINARY) USING utf8mb4) "
                            + "WHERE deleted = 0"
            );
            return Result.success("SQL 修复完成，共 " + updated + " 条记录");
        } catch (Exception e) {
            return Result.error("SQL 修复失败: " + e.getMessage());
        }
    }

    @GetMapping("/encoding/status")
    public Result<List<Map<String, Object>>> encodingStatus() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME "
                        + "FROM information_schema.COLUMNS "
                        + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'family_member' "
                        + "AND COLUMN_NAME IN ('name','occupation','introduction','workplace','current_address','audit_remark')"
        );
        return Result.success(rows);
    }

    @PostMapping("/seed")
    public Result<String> reseedMembers() {
        try {
            jdbcTemplate.update("DELETE FROM family_member");
            jdbcTemplate.update("ALTER TABLE family_member AUTO_INCREMENT = 1");

            insertSeedMember("Zhang Guoqiang", 1, "1950-03-15", "Retired Teacher", "First generation elder", null, null, 2L, 1, 1, 1, 0);
            insertSeedMember("Li Xiuying", 2, "1952-07-20", "Retired Doctor", "Spouse of Zhang Guoqiang", null, null, 1L, 1, 1, 1, 0);
            insertSeedMember("Zhang Ming", 1, "1975-11-08", "Engineer", "Son of Zhang Guoqiang and Li Xiuying", 1L, 2L, 4L, 2, 1, 1, 0);
            insertSeedMember("Wang Li", 2, "1978-04-12", "Teacher", "Spouse of Zhang Ming", null, null, 3L, 2, 1, 1, 0);
            insertSeedMember("Zhang Xiaoming", 1, "2005-06-18", "Student", "Son of Zhang Ming and Wang Li", 3L, 4L, null, 3, 1, 1, 0);
            insertSeedMember("Zhang Xiaohong", 2, "2008-09-25", "Student", "Daughter of Zhang Ming and Wang Li", 3L, 4L, null, 3, 1, 1, 0);

            return Result.success("已清空并重建演示数据");
        } catch (Exception e) {
            return Result.error("重建失败: " + e.getMessage());
        }
    }

    private void insertSeedMember(String name,
                                  Integer gender,
                                  String birthDate,
                                  String occupation,
                                  String introduction,
                                  Long fatherId,
                                  Long motherId,
                                  Long spouseId,
                                  Integer generation,
                                  Integer isAlive,
                                  Integer auditStatus,
                                  Integer deleted) {
        jdbcTemplate.update(
                "INSERT INTO family_member "
                        + "(name, gender, birth_date, occupation, introduction, father_id, mother_id, spouse_id, generation, is_alive, audit_status, deleted) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                name,
                gender,
                birthDate,
                occupation,
                introduction,
                fatherId,
                motherId,
                spouseId,
                generation,
                isAlive,
                auditStatus,
                deleted
        );
    }

    private String fixEncodingIfNeeded(String text) {
        if (text == null || text.isEmpty() || !looksLikeMojibake(text)) {
            return text;
        }
        try {
            byte[] bytes = text.getBytes(StandardCharsets.ISO_8859_1);
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return text;
        }
    }

    private boolean looksLikeMojibake(String text) {
        int latinCount = 0;
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (ch >= 0x00C0 && ch <= 0x00FF) {
                latinCount++;
            }
        }
        return latinCount >= 2;
    }

    private boolean equalsSafe(String left, String right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return left.equals(right);
    }
}
