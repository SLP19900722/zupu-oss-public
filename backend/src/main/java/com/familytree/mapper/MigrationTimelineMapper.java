package com.familytree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.familytree.entity.MigrationTimeline;
import org.apache.ibatis.annotations.Mapper;

/**
 * 迁徙时间轴 Mapper
 */
@Mapper
public interface MigrationTimelineMapper extends BaseMapper<MigrationTimeline> {
}
