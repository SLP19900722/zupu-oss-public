package com.familytree.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.familytree.entity.MigrationTimeline;
import com.familytree.mapper.MigrationTimelineMapper;
import com.familytree.service.MigrationTimelineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 迁徙时间轴服务实现
 */
@Service
public class MigrationTimelineServiceImpl implements MigrationTimelineService {
    
    @Autowired
    private MigrationTimelineMapper migrationTimelineMapper;
    
    @Override
    public List<MigrationTimeline> getAllTimeline() {
        QueryWrapper<MigrationTimeline> wrapper = new QueryWrapper<>();
        wrapper.orderByAsc("sort_order", "year");
        return migrationTimelineMapper.selectList(wrapper);
    }
    
    @Override
    public MigrationTimeline addTimeline(MigrationTimeline timeline) {
        migrationTimelineMapper.insert(timeline);
        return timeline;
    }
    
    @Override
    public MigrationTimeline updateTimeline(MigrationTimeline timeline) {
        migrationTimelineMapper.updateById(timeline);
        return timeline;
    }
    
    @Override
    public void deleteTimeline(Long id) {
        migrationTimelineMapper.deleteById(id);
    }
}
