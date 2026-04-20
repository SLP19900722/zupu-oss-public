package com.familytree.service;

import com.familytree.entity.MigrationTimeline;
import java.util.List;

/**
 * 迁徙时间轴服务接口
 */
public interface MigrationTimelineService {
    
    /**
     * 获取所有迁徙记录（按时间排序）
     */
    List<MigrationTimeline> getAllTimeline();
    
    /**
     * 添加迁徙记录（管理员）
     */
    MigrationTimeline addTimeline(MigrationTimeline timeline);
    
    /**
     * 更新迁徙记录（管理员）
     */
    MigrationTimeline updateTimeline(MigrationTimeline timeline);
    
    /**
     * 删除迁徙记录（管理员）
     */
    void deleteTimeline(Long id);
}
