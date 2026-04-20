package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.FamilyMember;
import com.familytree.service.FamilyMemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 家族树控制器（增强）
 */
@RestController
@RequestMapping("/tree")
public class FamilyTreeController {

    @Autowired
    private FamilyMemberService familyMemberService;

    /**
     * 获取家族树（已审核成员）
     */
    @GetMapping("/all")
    public Result<List<FamilyMember>> getFamilyTree() {
        List<FamilyMember> tree = familyMemberService.getFamilyTree();
        return Result.success(tree);
    }
}
