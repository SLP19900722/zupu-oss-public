package com.familytree.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 迁徙时间轴实体类
 */
@Data
@TableName("migration_timeline")
public class MigrationTimeline {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    /**
     * 事件标题
     */
    private String title;
    
    /**
     * 详细描述
     */
    private String description;
    
    /**
     * 地点
     */
    private String location;
    
    /**
     * 纬度
     */
    private BigDecimal latitude;
    
    /**
     * 经度
     */
    private BigDecimal longitude;
    
    /**
     * 年份
     */
    private Integer year;
    
    /**
     * 朝代
     */
    private String dynasty;
    
    /**
     * 第几代
     */
    private Integer generation;
    
    /**
     * 关键人物
     */
    private String keyPerson;
    
    /**
     * 排序
     */
    private Integer sortOrder;
    
    /**
     * 图标类型
     */
    private String icon;
    
    /**
     * 颜色
     */
    private String color;
    
    /**
     * 配图URL
     */
    private String imageUrl;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
