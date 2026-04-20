package com.familytree.service;

import com.familytree.entity.FamilyMember;

import java.util.List;

public interface MemberService {
    List<FamilyMember> getAllMembers();
    List<FamilyMember> searchMembers(String keyword);
    FamilyMember getMember(Long id);
    FamilyMember createMember(FamilyMember member);
    FamilyMember updateMember(Long id, FamilyMember member);
    void deleteMember(Long id);
}