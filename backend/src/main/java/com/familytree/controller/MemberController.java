package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.FamilyMember;
import com.familytree.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping
    public Result<List<FamilyMember>> getAllMembers() {
        return Result.success(memberService.getAllMembers());
    }

    @GetMapping("/search")
    public Result<List<FamilyMember>> searchMembers(@RequestParam String q) {
        return Result.success(memberService.searchMembers(q));
    }

    @GetMapping("/{id}")
    public Result<FamilyMember> getMember(@PathVariable Long id) {
        FamilyMember member = memberService.getMember(id);
        return member != null ? Result.success(member) : Result.error("成员不存在");
    }

    @PostMapping
    public Result<FamilyMember> createMember(@RequestBody FamilyMember member) {
        FamilyMember created = memberService.createMember(member);
        return created != null ? Result.success(created) : Result.error("创建失败");
    }

    @PutMapping("/{id}")
    public Result<FamilyMember> updateMember(@PathVariable Long id, @RequestBody FamilyMember member) {
        FamilyMember updated = memberService.updateMember(id, member);
        return updated != null ? Result.success(updated) : Result.error("更新失败");
    }

    @DeleteMapping("/{id}")
    public Result<String> deleteMember(@PathVariable Long id) {
        memberService.deleteMember(id);
        return Result.success("删除成功");
    }
}
