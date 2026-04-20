package com.familytree.service;

import com.familytree.dto.notification.FamilyEventNotificationCreateRequest;
import com.familytree.dto.notification.FamilyEventSubscriptionAcceptRequest;

import java.util.List;
import java.util.Map;

public interface FamilyEventNotificationService {

    Map<String, Object> getSubscriptionStatus(Long userId);

    Map<String, Object> acceptSubscription(Long userId, FamilyEventSubscriptionAcceptRequest request);

    Map<String, Object> createNotification(Long creatorId, FamilyEventNotificationCreateRequest request);

    Map<String, Object> updateNotification(Long operatorId, Long notificationId, FamilyEventNotificationCreateRequest request);

    Map<String, Object> sendNotification(Long operatorId, Long notificationId);

    void deleteNotification(Long operatorId, Long notificationId);

    List<Map<String, Object>> listAdminHistory();

    List<Map<String, Object>> listPublicNotifications(int limit);

    Map<String, Object> getPublicNotification(Long notificationId);
}
