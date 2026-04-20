package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.FamilyMember;
import com.familytree.service.FamilyMemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 成员搜索（POST）
 */
@RestController
@RequestMapping("/member")
public class FamilyMemberSearchController {

    @Autowired
    private FamilyMemberService familyMemberService;

    @PostMapping("/search")
    public Result<List<FamilyMember>> searchMembersPost(@RequestBody Map<String, String> body) {
        String keyword = body.get("keyword");
        List<FamilyMember> members = familyMemberService.searchMembers(keyword);
        return Result.success(members);
    }
}
