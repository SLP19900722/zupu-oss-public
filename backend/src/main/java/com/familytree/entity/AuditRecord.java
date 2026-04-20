package com.familytree.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 审核记录实体类
 */
@Data
@TableName("audit_records")
public class AuditRecord {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 审核类型：1-成员创建，2-成员修改，3-成员删除
     */
    @TableField("audit_type")
    private Integer auditType;

    @TableField("target_id")
    private Long targetId;

    @TableField("target_type")
    private String targetType;

    @TableField("content")
    private String content;

    @TableField("old_content")
    private String oldContent;

    @TableField("submitter_id")
    private Long submitterId;

    @TableField("auditor_id")
    private Long auditorId;

    /**
     * 审核状态：0-待审核，1-已通过，2-已拒绝
     */
    @TableField("audit_status")
    private Integer auditStatus;

    @TableField("audit_result")
    private String auditResult;

    @TableField("submitted_at")
    private LocalDateTime submittedAt;

    @TableField("audited_at")
    private LocalDateTime auditedAt;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    @TableField("deleted")
    private Integer deleted;
}
