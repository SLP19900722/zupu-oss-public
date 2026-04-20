package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.User;
import com.familytree.service.AdminService;
import com.familytree.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private AuthService authService;

    @GetMapping("/users")
    public Result<List<User>> getUsers(
            @RequestParam(required = false) Integer role,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String keyword,
            @RequestHeader("Authorization") String authorization) {

        String token = authorization.replace("Bearer ", "");
        User operator = authService.getCurrentUserByToken(token);
        Integer userRole = operator == null ? null : operator.getRole();
        if (userRole == null || userRole < 2) {
            return Result.error("No permission");
        }

        return Result.success(adminService.listUsers(role, status, keyword));
    }

    @PutMapping("/user/{id}/role")
    public Result<String> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> params,
            @RequestHeader("Authorization") String authorization) {

        String token = authorization.replace("Bearer ", "");
        User operator = authService.getCurrentUserByToken(token);
        Integer userRole = operator == null ? null : operator.getRole();
        if (userRole == null || userRole < 2) {
            return Result.error("No permission");
        }

        Integer role = params.get("role");
        if (role == null || (role != 0 && role != 1)) {
            return Result.error("role only supports 0 or 1");
        }
        if (operator != null && operator.getId() != null && operator.getId().equals(id)) {
            return Result.error("cannot modify self");
        }

        User targetUser = authService.getUserById(id);
        if (targetUser == null) {
            return Result.error("User not found");
        }
        if (targetUser.getRole() != null && targetUser.getRole() >= 2) {
            return Result.error("cannot modify super admin");
        }

        boolean success = adminService.updateUserRole(id, role);
        return success ? Result.success("Role updated") : Result.error("Role update failed");
    }

    @PutMapping("/user/{id}/status")
    public Result<String> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> params,
            @RequestHeader("Authorization") String authorization) {

        String token = authorization.replace("Bearer ", "");
        User operator = authService.getCurrentUserByToken(token);
        Integer userRole = operator == null ? null : operator.getRole();
        if (userRole == null || userRole < 1) {
            return Result.error("No permission");
        }

        Integer status = params.get("status");
        boolean success = adminService.updateUserStatus(id, status);
        return success ? Result.success("Status updated") : Result.error("Status update failed");
    }

    @GetMapping("/user/{id}/binding")
    public Result<Map<String, Object>> getUserBindingDetail(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authorization) {

        String token = authorization.replace("Bearer ", "");
        User operator = authService.getCurrentUserByToken(token);
        Integer userRole = operator == null ? null : operator.getRole();
        if (userRole == null || userRole < 2) {
            return Result.error("No permission");
        }

        try {
            return Result.success(adminService.getUserBindingDetail(id));
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        }
    }

    @GetMapping("/user/{id}/bindable-members")
    public Result<List<Map<String, Object>>> getBindableMembersForUser(
            @PathVariable Long id,
            @RequestParam(required = false) String keyword,
            @RequestHeader("Authorization") String authorization) {

        String token = authorization.replace("Bearer ", "");
        User operator = authService.getCurrentUserByToken(token);
        Integer userRole = operator == null ? null : operator.getRole();
        if (userRole == null || userRole < 2) {
            return Result.error("No permission");
        }

        try {
            return Result.success(adminService.listBindableMembersForUser(id, keyword));
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        }
    }

    @PutMapping("/user/{id}/preferred-member")
    public Result<Map<String, Object>> updateUserPreferredMember(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> params,
            @RequestHeader("Authorization") String authorization) {

        String token = authorization.replace("Bearer ", "");
        User operator = authService.getCurrentUserByToken(token);
        Integer userRole = operator == null ? null : operator.getRole();
        if (userRole == null || userRole < 2) {
            return Result.error("No permission");
        }

        Long memberId = parseLong(params == null ? null : params.get("memberId"));
        try {
            return Result.success(adminService.updateUserPreferredMember(id, memberId, operator == null ? null : operator.getId()));
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        }
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            String text = String.valueOf(value).trim();
            return text.isEmpty() ? null : Long.parseLong(text);
        } catch (Exception ignored) {
            return null;
        }
    }
}
