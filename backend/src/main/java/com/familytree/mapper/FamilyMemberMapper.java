package com.familytree.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.familytree.entity.FamilyMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FamilyMemberMapper extends BaseMapper<FamilyMember> {
    
    @Select("SELECT * FROM family_member WHERE deleted = 0 AND audit_status = 1 AND is_external_spouse = 0 AND (father_id = #{parentId} OR mother_id = #{parentId})")
    List<FamilyMember> findChildren(Long parentId);
    
    @Select("SELECT * FROM family_member WHERE deleted = 0 AND audit_status = 1 AND is_external_spouse = 0 AND id IN (SELECT father_id FROM family_member WHERE id = #{memberId} UNION SELECT mother_id FROM family_member WHERE id = #{memberId})")
    List<FamilyMember> findParents(Long memberId);

    @Select("SELECT * FROM family_member WHERE deleted = 0 AND audit_status = 1 AND is_external_spouse = 0 AND (name LIKE CONCAT('%', #{keyword}, '%') OR occupation LIKE CONCAT('%', #{keyword}, '%') OR current_address LIKE CONCAT('%', #{keyword}, '%'))")
    List<FamilyMember> searchByKeyword(@Param("keyword") String keyword);
}
