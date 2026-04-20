package com.familytree.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.familytree.entity.FamilyMember;
import java.util.List;

public interface FamilyMemberService extends IService<FamilyMember> {
    
    List<FamilyMember> getAllMembers();
    
    List<FamilyMember> searchMembers(String keyword);
    
    FamilyMember getMemberById(Long id);

    FamilyMember getMemberByIdIncludingHidden(Long id);

    FamilyMember getAnyMemberById(Long id);

    List<FamilyMember> getBindableMembers();

    List<FamilyMember> getBindableMembers(Long currentUserId, boolean isAdmin);

    FamilyMember getExternalSpouseByOwnerId(Long ownerMemberId);

    FamilyMember ensureExternalSpouseForMember(Long ownerMemberId);

    FamilyMember bindExternalSpouseIdentity(Long userId, Long ownerMemberId, String spouseName);
    
    boolean createMember(FamilyMember member);
    
    boolean updateMember(Long id, FamilyMember member);
    
    boolean deleteMember(Long id);
    
    List<FamilyMember> getChildren(Long parentId);
    
    List<FamilyMember> getParents(Long memberId);
    
    List<FamilyMember> getFamilyTree();
}
