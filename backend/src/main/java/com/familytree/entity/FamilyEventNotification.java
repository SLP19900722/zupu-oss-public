package com.familytree.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("family_event_notification")
public class FamilyEventNotification {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("creator_id")
    private Long creatorId;

    @TableField("template_key")
    private String templateKey;

    @TableField("template_id")
    private String templateId;

    @TableField("event_type")
    private String eventType;

    @TableField("member_name")
    private String memberName;

    @TableField("event_time")
    private String eventTime;

    @TableField("location")
    private String location;

    @TableField("remark")
    private String remark;

    @TableField("status")
    private String status;

    @TableField("recipient_count")
    private Integer recipientCount;

    @TableField("success_count")
    private Integer successCount;

    @TableField("failure_count")
    private Integer failureCount;

    @TableField("last_sent_at")
    private LocalDateTime lastSentAt;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt=LocalDateTime.now();

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt=LocalDateTime.now();;

    @TableLogic
    @TableField("deleted")
    private Integer deleted;
}
