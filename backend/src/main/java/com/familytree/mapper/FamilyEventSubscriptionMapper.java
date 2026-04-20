package com.familytree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.familytree.entity.FamilyEventSubscription;
import com.familytree.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface FamilyEventSubscriptionMapper extends BaseMapper<FamilyEventSubscription> {

    @Select("SELECT * FROM family_event_subscription "
            + "WHERE user_id = #{userId} AND template_id = #{templateId} AND deleted = 0 "
            + "ORDER BY id DESC LIMIT 1")
    FamilyEventSubscription selectByUserIdAndTemplateId(@Param("userId") Long userId,
                                                        @Param("templateId") String templateId);

    @Select("SELECT u.* FROM users u "
            + "INNER JOIN family_event_subscription s ON s.user_id = u.id AND s.deleted = 0 "
            + "WHERE u.deleted = 0 "
            + "AND IFNULL(u.status, 0) = 0 "
            + "AND u.openid IS NOT NULL AND u.openid <> '' "
            + "AND u.preferred_member_id IS NOT NULL "
            + "AND s.template_id = #{templateId} "
            + "AND s.subscribe_status = 'ACCEPTED'")
    List<User> selectEligibleUsers(@Param("templateId") String templateId);

    @Select("SELECT COUNT(1) FROM users u "
            + "INNER JOIN family_event_subscription s ON s.user_id = u.id AND s.deleted = 0 "
            + "WHERE u.deleted = 0 "
            + "AND IFNULL(u.status, 0) = 0 "
            + "AND u.openid IS NOT NULL AND u.openid <> '' "
            + "AND u.preferred_member_id IS NOT NULL "
            + "AND s.template_id = #{templateId} "
            + "AND s.subscribe_status = 'ACCEPTED'")
    Integer countEligibleUsers(@Param("templateId") String templateId);
}
