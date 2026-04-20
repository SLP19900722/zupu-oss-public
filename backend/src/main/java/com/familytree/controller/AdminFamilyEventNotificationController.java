package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.dto.notification.FamilyEventNotificationCreateRequest;
import com.familytree.entity.User;
import com.familytree.service.AuthService;
import com.familytree.service.FamilyEventNotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/admin/family-event-notifications")
public class AdminFamilyEventNotificationController {

    private final FamilyEventNotificationService familyEventNotificationService;
    private final AuthService authService;

    public AdminFamilyEventNotificationController(FamilyEventNotificationService familyEventNotificationService,
                                                  AuthService authService) {
        this.familyEventNotificationService = familyEventNotificationService;
        this.authService = authService;
    }

    @PostMapping
    public Result<Map<String, Object>> createNotification(@RequestBody FamilyEventNotificationCreateRequest request,
                                                          @RequestHeader("Authorization") String authorization) {
        try {
            User operator = requireAdmin(authorization);
            return Result.success(familyEventNotificationService.createNotification(operator.getId(), request));
        } catch (Exception e) {
            log.error("create family event notification failed", e);
            return Result.error(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public Result<Map<String, Object>> updateNotification(@PathVariable Long id,
                                                          @RequestBody FamilyEventNotificationCreateRequest request,
                                                          @RequestHeader("Authorization") String authorization) {
        try {
            User operator = requireAdmin(authorization);
            return Result.success(familyEventNotificationService.updateNotification(operator.getId(), id, request));
        } catch (Exception e) {
            log.error("update family event notification failed", e);
            return Result.error(e.getMessage());
        }
    }

    @PostMapping("/{id}/send")
    public Result<Map<String, Object>> sendNotification(@PathVariable Long id,
                                                        @RequestHeader("Authorization") String authorization) {
        try {
            User operator = requireAdmin(authorization);
            return Result.success(familyEventNotificationService.sendNotification(operator.getId(), id));
        } catch (Exception e) {
            log.error("send family event notification failed", e);
            return Result.error(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public Result<String> deleteNotification(@PathVariable Long id,
                                             @RequestHeader("Authorization") String authorization) {
        try {
            User operator = requireSuperAdmin(authorization);
            familyEventNotificationService.deleteNotification(operator.getId(), id);
            return Result.success("Notification deleted");
        } catch (Exception e) {
            log.error("delete family event notification failed", e);
            return Result.error(e.getMessage());
        }
    }

    @GetMapping("/history")
    public Result<List<Map<String, Object>>> getHistory(@RequestHeader("Authorization") String authorization) {
        try {
            requireAdmin(authorization);
            return Result.success(familyEventNotificationService.listAdminHistory());
        } catch (Exception e) {
            log.error("get family event notification history failed", e);
            return Result.error(e.getMessage());
        }
    }

    private User requireAdmin(String authorization) {
        String token = extractToken(authorization);
        User user = authService.getCurrentUserByToken(token);
        Integer role = user == null ? null : user.getRole();
        if (role == null || role.intValue() < 1) {
            throw new IllegalStateException("No permission");
        }
        return user;
    }

    private User requireSuperAdmin(String authorization) {
        String token = extractToken(authorization);
        User user = authService.getCurrentUserByToken(token);
        Integer role = user == null ? null : user.getRole();
        if (role == null || role.intValue() < 2) {
            throw new IllegalStateException("No permission");
        }
        return user;
    }

    private String extractToken(String authorization) {
        if (authorization == null) {
            return null;
        }
        return authorization.replace("Bearer ", "");
    }
}
