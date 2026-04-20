package com.familytree.service.impl;

import com.familytree.entity.FamilyMember;
import com.familytree.service.FamilyMemberService;
import com.familytree.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final FamilyMemberService familyMemberService;

    @Override
    public List<FamilyMember> getAllMembers() {
        return familyMemberService.getAllMembers();
    }

    @Override
    public List<FamilyMember> searchMembers(String keyword) {
        return familyMemberService.searchMembers(keyword);
    }

    @Override
    public FamilyMember getMember(Long id) {
        return familyMemberService.getMemberById(id);
    }

    @Override
    public FamilyMember createMember(FamilyMember member) {
        boolean ok = familyMemberService.createMember(member);
        return ok ? member : null;
    }

    @Override
    public FamilyMember updateMember(Long id, FamilyMember member) {
        boolean ok = familyMemberService.updateMember(id, member);
        return ok ? familyMemberService.getMemberById(id) : null;
    }

    @Override
    public void deleteMember(Long id) {
        familyMemberService.deleteMember(id);
    }
}