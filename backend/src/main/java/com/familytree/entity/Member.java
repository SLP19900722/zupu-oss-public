package com.familytree.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * 兼容旧结构的成员实体（当前系统主要使用FamilyMember）
 */
@Data
@TableName("family_member")
public class Member {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("name")
    private String name;

    @TableField("gender")
    private Integer gender;

    @TableField("birth_date")
    private String birthDate;

    @TableField("phone")
    private String phone;

    @TableField("current_address")
    private String currentAddress;

    @TableLogic
    @TableField("deleted")
    private Integer deleted;
}