package com.familytree.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("family_member")
public class FamilyMember {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String name;
    private Integer gender; // 1-男，2-女
    private String birthDate;
    private String idCard;
    private String phone;
    private String occupation;
    private String workplace;
    private String currentAddress;
    private Long fatherId;
    private Long motherId;
    private Long spouseId;
    private String spouseName;
    private String motherName;
    private String avatarUrl;
    private String introduction;
    private Integer isAlive; // 1-在世，0-已故
    private String deathDate;
    private Integer sortOrder;
    private Integer isExternalSpouse;

    /**
     * 关联用户ID
     */
    private Long userId;

    /**
     * 创建者ID
     */
    private Long creatorId;

    /**
     * 世代（第几代）
     */
    private Integer generation;

    /**
     * 审核状态：0-待审核，1-已通过，2-已拒绝
     */
    private Integer auditStatus;

    /**
     * 审核人ID
     */
    private Long auditorId;

    /**
     * 审核时间
     */
    private LocalDateTime auditTime;

    /**
     * 审核备注
     */
    private String auditRemark;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
    
    @TableLogic
    private Integer deleted;

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
}
