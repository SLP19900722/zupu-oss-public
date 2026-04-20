package com.familytree.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * 家族实体类
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("families")
public class Family {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 家族名称
     */
    @TableField("family_name")
    private String familyName;

    /**
     * 姓氏
     */
    @TableField("surname")
    private String surname;

    /**
     * 家族描述
     */
    @TableField("description")
    private String description;

    /**
     * 家族头像
     */
    @TableField("avatar_url")
    private String avatarUrl;

    /**
     * 家族籍贯
     */
    @TableField("hometown")
    private String hometown;

    /**
     * 家族堂号
     */
    @TableField("hall_name")
    private String hallName;

    /**
     * 字辈排行
     */
    @TableField("generation_order")
    private String generationOrder;

    /**
     * 家族创始人ID
     */
    @TableField("founder_id")
    private Long founderId;

    /**
     * 当前管理员ID
     */
    @TableField("admin_id")
    private Long adminId;

    /**
     * 成员数量
     */
    @TableField("member_count")
    private Integer memberCount;

    /**
     * 世代数量
     */
    @TableField("generation_count")
    private Integer generationCount;

    /**
     * 照片数量
     */
    @TableField("photo_count")
    private Integer photoCount;

    /**
     * 是否公开 0-私有 1-公开
     */
    @TableField("is_public")
    private Integer isPublic;

    /**
     * 状态 0-正常 1-禁用
     */
    @TableField("status")
    private Integer status;

    /**
     * 创建时间
     */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 逻辑删除标记 0-未删除 1-已删除
     */
    @TableLogic
    @TableField("deleted")
    private Integer deleted;
}