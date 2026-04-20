package com.familytree.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("family_event_notification_delivery")
public class FamilyEventNotificationDelivery {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("notification_id")
    private Long notificationId;

    @TableField("user_id")
    private Long userId;

    @TableField("openid")
    private String openid;

    @TableField("template_id")
    private String templateId;

    @TableField("send_status")
    private String sendStatus;

    @TableField("error_code")
    private Integer errorCode;

    @TableField("error_message")
    private String errorMessage;

    @TableField("msg_id")
    private String msgId;

    @TableField("sent_at")
    private LocalDateTime sentAt;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
