package com.familytree.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * 用户实体类
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("users")
public class User {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 微信openid
     */
    @TableField("openid")
    private String openid;

    /**
     * 微信unionid
     */
    @TableField("unionid")
    private String unionid;

    /**
     * 昵称
     */
    @TableField("nick_name")
    private String nickName;

    /**
     * 头像URL
     */
    @TableField("avatar_url")
    private String avatarUrl;

    /**
     * 性别 0-未知 1-男 2-女
     */
    @TableField("gender")
    private Integer gender;

    /**
     * 手机号
     */
    @TableField("phone")
    private String phone;

    /**
     * 邮箱
     */
    @TableField("email")
    private String email;

    /**
     * 真实姓名
     */
    @TableField("real_name")
    private String realName;

    /**
     * 身份证号
     */
    @TableField("id_card")
    private String idCard;

    /**
     * 角色 0-普通用户 1-管理员 2-超级管理员
     */
    @TableField("role")
    private Integer role;

    /**
     * 用户绑定的“我是成员”ID
     */
    @TableField("preferred_member_id")
    private Long preferredMemberId;

    @TableField(exist = false)
    private String preferredMemberName;

    @TableField(exist = false)
    private String identityType;

    @TableField(exist = false)
    private Boolean preferredMemberVisible;

    @TableField(exist = false)
    private Long displayMemberId;

    @TableField(exist = false)
    private String displayMemberName;

    @TableField(exist = false)
    private Long spouseOwnerMemberId;

    @TableField(exist = false)
    private String spouseOwnerMemberName;

    /**
     * 状态 0-正常 1-禁用
     */
    @TableField("status")
    private Integer status;

    /**
     * 最后登录时间
     */
    @TableField("last_login_time")
    private LocalDateTime lastLoginTime;

    /**
     * 最后登录IP
     */
    @TableField("last_login_ip")
    private String lastLoginIp;

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
