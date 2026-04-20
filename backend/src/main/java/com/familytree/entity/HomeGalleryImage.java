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
@TableName("home_gallery_image")
public class HomeGalleryImage {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String imageUrl;
    private String thumbUrl;
    private String title;
    private String description;
    private Long uploaderId;
    private Integer uploaderRole;
    private Integer status;
    private Integer sortOrder;
    private Long reviewerId;
    private String reviewRemark;
    private LocalDateTime reviewedAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
