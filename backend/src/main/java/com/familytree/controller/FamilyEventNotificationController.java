package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.dto.notification.FamilyEventSubscriptionAcceptRequest;
import com.familytree.entity.User;
import com.familytree.service.AuthService;
import com.familytree.service.FamilyEventNotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/notify/family-event")
public class FamilyEventNotificationController {

    private final FamilyEventNotificationService familyEventNotificationService;
    private final AuthService authService;

    public FamilyEventNotificationController(FamilyEventNotificationService familyEventNotificationService,
                                             AuthService authService) {
        this.familyEventNotificationService = familyEventNotificationService;
        this.authService = authService;
    }

    @GetMapping("/subscription/status")
    public Result<Map<String, Object>> getSubscriptionStatus(@RequestHeader("Authorization") String authorization) {
        try {
            User user = requireCurrentUser(authorization);
            return Result.success(familyEventNotificationService.getSubscriptionStatus(user.getId()));
        } catch (Exception e) {
            log.error("get family event subscription status failed", e);
            return Result.error(e.getMessage());
        }
    }

    @PostMapping("/subscription/accept")
    public Result<Map<String, Object>> acceptSubscription(@RequestBody FamilyEventSubscriptionAcceptRequest request,
                                                          @RequestHeader("Authorization") String authorization) {
        try {
            User user = requireCurrentUser(authorization);
            return Result.success(familyEventNotificationService.acceptSubscription(user.getId(), request));
        } catch (Exception e) {
            log.error("accept family event subscription failed", e);
            return Result.error(e.getMessage());
        }
    }

    @GetMapping("/notifications")
    public Result<List<Map<String, Object>>> listNotifications(@RequestParam(defaultValue = "20") Integer limit,
                                                               @RequestHeader("Authorization") String authorization) {
        try {
            requireCurrentUser(authorization);
            return Result.success(familyEventNotificationService.listPublicNotifications(limit == null ? 20 : limit.intValue()));
        } catch (Exception e) {
            log.error("list family event notifications failed", e);
            return Result.error(e.getMessage());
        }
    }

    @GetMapping("/notifications/{id}")
    public Result<Map<String, Object>> getNotification(@PathVariable Long id,
                                                       @RequestHeader("Authorization") String authorization) {
        try {
            requireCurrentUser(authorization);
            Map<String, Object> notification = familyEventNotificationService.getPublicNotification(id);
            if (notification == null || notification.isEmpty()) {
                return Result.error("通知不存在或暂不可查看");
            }
            return Result.success(notification);
        } catch (Exception e) {
            log.error("get family event notification failed", e);
            return Result.error(e.getMessage());
        }
    }

    private User requireCurrentUser(String authorization) {
        String token = extractToken(authorization);
        User user = authService.getCurrentUserByToken(token);
        if (user == null || user.getId() == null) {
            throw new IllegalStateException("Please login first");
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
