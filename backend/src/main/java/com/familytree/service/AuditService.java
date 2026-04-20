package com.familytree.service;

import com.familytree.entity.AuditRecord;
import com.familytree.entity.FamilyMember;
import java.util.List;

public interface AuditService {
    /**
     * 获取待审核成员列表
     */
    List<FamilyMember> getPendingMembers();
    
    /**
     * 审核成员信息
     */
    boolean auditMember(Long id, Integer status, String remark, Long auditorId);
    
    /**
     * 获取审核历史
     */
    List<AuditRecord> getAuditHistory(Long memberId);
    
    /**
     * 提交成员审核
     */
    Long submitMemberAudit(FamilyMember member);

    /**
     * 提交成员更新审核
     */
    Long submitMemberUpdateAudit(FamilyMember member, FamilyMember oldMember);
}
