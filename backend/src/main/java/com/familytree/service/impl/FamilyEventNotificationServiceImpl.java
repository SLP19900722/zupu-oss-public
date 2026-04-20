package com.familytree.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.familytree.config.FamilyEventSubscribeProperties;
import com.familytree.dto.notification.FamilyEventNotificationCreateRequest;
import com.familytree.dto.notification.FamilyEventSubscriptionAcceptRequest;
import com.familytree.entity.FamilyEventNotification;
import com.familytree.entity.FamilyEventNotificationDelivery;
import com.familytree.entity.FamilyEventSubscription;
import com.familytree.entity.User;
import com.familytree.mapper.FamilyEventNotificationDeliveryMapper;
import com.familytree.mapper.FamilyEventNotificationMapper;
import com.familytree.mapper.FamilyEventSubscriptionMapper;
import com.familytree.mapper.UserMapper;
import com.familytree.service.FamilyEventNotificationService;
import com.familytree.service.WechatMiniAppAccessTokenService;
import com.familytree.util.FamilyEventSubscribeMessageAssembler;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class FamilyEventNotificationServiceImpl implements FamilyEventNotificationService {

    private static final String SUBSCRIBE_ACCEPTED = "ACCEPTED";
    private static final String SUBSCRIBE_REJECTED = "REJECTED";
    private static final String SUBSCRIBE_BANNED = "BANNED";
    private static final String SUBSCRIBE_FILTERED = "FILTERED";
    private static final String SUBSCRIBE_NONE = "NONE";
    private static final String SUBSCRIBE_USED = "USED";
    private static final String SUBSCRIBE_PARTIAL = "PARTIAL";
    private static final String SUBSCRIBE_INVALID_OPENID = "INVALID_OPENID";

    private static final String NOTIFICATION_DRAFT = "DRAFT";
    private static final String NOTIFICATION_SENDING = "SENDING";
    private static final String NOTIFICATION_SENT = "SENT";
    private static final String NOTIFICATION_PARTIAL = "PARTIAL";
    private static final String NOTIFICATION_FAILED = "FAILED";
    private static final String NOTIFICATION_NO_RECIPIENT = "NO_RECIPIENT";

    private static final String DELIVERY_SUCCESS = "SUCCESS";
    private static final String DELIVERY_FAILED = "FAILED";

    private final UserMapper userMapper;
    private final FamilyEventSubscriptionMapper familyEventSubscriptionMapper;
    private final FamilyEventNotificationMapper familyEventNotificationMapper;
    private final FamilyEventNotificationDeliveryMapper familyEventNotificationDeliveryMapper;
    private final FamilyEventSubscribeProperties properties;
    private final WechatMiniAppAccessTokenService accessTokenService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final FamilyEventSubscribeMessageAssembler assembler = new FamilyEventSubscribeMessageAssembler();

    public FamilyEventNotificationServiceImpl(UserMapper userMapper,
                                              FamilyEventSubscriptionMapper familyEventSubscriptionMapper,
                                              FamilyEventNotificationMapper familyEventNotificationMapper,
                                              FamilyEventNotificationDeliveryMapper familyEventNotificationDeliveryMapper,
                                              FamilyEventSubscribeProperties properties,
                                              WechatMiniAppAccessTokenService accessTokenService) {
        this.userMapper = userMapper;
        this.familyEventSubscriptionMapper = familyEventSubscriptionMapper;
        this.familyEventNotificationMapper = familyEventNotificationMapper;
        this.familyEventNotificationDeliveryMapper = familyEventNotificationDeliveryMapper;
        this.properties = properties;
        this.accessTokenService = accessTokenService;
    }

    @Override
    public Map<String, Object> getSubscriptionStatus(Long userId) {
        User user = userId == null ? null : userMapper.selectById(userId);
        List<FamilyEventSubscribeProperties.TemplateConfig> templates = properties.getEnabledTemplates();
        List<Map<String, Object>> templateItems = new ArrayList<Map<String, Object>>();

        int acceptedCount = 0;
        int enabledCount = templates.size();
        LocalDateTime latestAcceptedAt = null;
        String firstTemplateId = null;
        String firstPage = null;

        for (FamilyEventSubscribeProperties.TemplateConfig template : templates) {
            FamilyEventSubscription subscription = (userId == null || !hasText(template.getTemplateId()))
                    ? null
                    : familyEventSubscriptionMapper.selectByUserIdAndTemplateId(userId, template.getTemplateId());

            String status = subscription == null ? SUBSCRIBE_NONE : safeText(subscription.getSubscribeStatus(), 32);
            if (SUBSCRIBE_ACCEPTED.equals(status)) {
                acceptedCount++;
                if (subscription.getAcceptedAt() != null
                        && (latestAcceptedAt == null || subscription.getAcceptedAt().isAfter(latestAcceptedAt))) {
                    latestAcceptedAt = subscription.getAcceptedAt();
                }
            }

            if (!hasText(firstTemplateId)) {
                firstTemplateId = safeText(template.getTemplateId(), 128);
            }
            if (!hasText(firstPage)) {
                firstPage = safeText(template.getPage(), 128);
            }

            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("key", safeText(template.getKey(), 32));
            item.put("title", safeText(template.getTitle(), 32));
            item.put("templateId", safeText(template.getTemplateId(), 128));
            item.put("page", safeText(template.getPage(), 128));
            item.put("eventTypes", resolveEventTypes(template.getKey()));
            item.put("subscribeStatus", status);
            item.put("statusText", buildSingleTemplateStatusText(status));
            item.put("acceptedAt", subscription == null ? null : subscription.getAcceptedAt());
            templateItems.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("enabled", Boolean.valueOf(properties.isEnabled()));
        result.put("mode", safeText(properties.getMode(), 32));
        result.put("templateId", firstTemplateId);
        result.put("page", firstPage);
        result.put("requestTemplateIds", properties.getEnabledTemplateIds());
        result.put("templates", templateItems);
        result.put("enabledTemplateCount", Integer.valueOf(enabledCount));
        result.put("acceptedTemplateCount", Integer.valueOf(acceptedCount));
        result.put("preferredMemberBound", Boolean.valueOf(user != null && user.getPreferredMemberId() != null));
        result.put("fullySubscribed", Boolean.valueOf(enabledCount > 0 && acceptedCount == enabledCount));
        result.put("subscribed", Boolean.valueOf(acceptedCount > 0));
        result.put("subscribeStatus", buildAggregateSubscriptionStatus(acceptedCount, enabledCount));
        result.put("statusText", buildAggregateSubscriptionStatusText(acceptedCount, enabledCount));
        result.put("acceptedAt", latestAcceptedAt);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> acceptSubscription(Long userId, FamilyEventSubscriptionAcceptRequest request) {
        ensureSubscriptionReady();
        User user = requireUser(userId);
        if (!hasText(user.getOpenid())) {
            throw new IllegalStateException("当前用户缺少 openid，无法保存订阅状态");
        }

        boolean updated = false;
        List<FamilyEventSubscribeProperties.TemplateConfig> templates = properties.getEnabledTemplates();
        Map<String, String> resultMap = request == null ? null : request.getResult();

        for (FamilyEventSubscribeProperties.TemplateConfig template : templates) {
            String rawResult = extractSubscribeResult(request, template.getTemplateId(), resultMap);
            if (!hasText(rawResult)) {
                continue;
            }
            upsertSubscription(user, template.getTemplateId(), rawResult, request == null ? null : request.getScene());
            updated = true;
        }

        if (!updated) {
            String fallbackTemplateId = safeText(request == null ? null : request.getTemplateId(), 128);
            if (!hasText(fallbackTemplateId)) {
                FamilyEventSubscribeProperties.TemplateConfig defaultTemplate = properties.resolveDefaultTemplate();
                fallbackTemplateId = defaultTemplate == null ? null : defaultTemplate.getTemplateId();
            }
            String rawResult = request != null && request.getAccepted() != null
                    ? (request.getAccepted().booleanValue() ? "accept" : "reject")
                    : null;
            if (hasText(fallbackTemplateId) && hasText(rawResult)) {
                upsertSubscription(user, fallbackTemplateId, rawResult, request == null ? null : request.getScene());
            }
        }

        return getSubscriptionStatus(userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> createNotification(Long creatorId, FamilyEventNotificationCreateRequest request) {
        ensureSubscriptionReady();
        if (creatorId == null || creatorId <= 0) {
            throw new IllegalStateException("请先登录");
        }

        FamilyEventNotification notification = new FamilyEventNotification();
        notification.setCreatorId(creatorId);
        applyDraftFields(notification, request);
        notification.setStatus(NOTIFICATION_DRAFT);
        notification.setSuccessCount(Integer.valueOf(0));
        notification.setFailureCount(Integer.valueOf(0));
        notification.setLastSentAt(null);

        familyEventNotificationMapper.insert(notification);
        return buildAdminNotification(notification, true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> updateNotification(Long operatorId,
                                                  Long notificationId,
                                                  FamilyEventNotificationCreateRequest request) {
        ensureSubscriptionReady();
        if (operatorId == null || operatorId <= 0) {
            throw new IllegalStateException("请先登录");
        }
        if (notificationId == null || notificationId <= 0) {
            throw new IllegalStateException("通知 ID 无效");
        }

        FamilyEventNotification notification = familyEventNotificationMapper.selectById(notificationId);
        if (notification == null || (notification.getDeleted() != null && notification.getDeleted().intValue() == 1)) {
            throw new IllegalStateException("通知不存在");
        }
        if (!NOTIFICATION_DRAFT.equals(notification.getStatus())) {
            throw new IllegalStateException("仅待发送草稿支持编辑");
        }

        applyDraftFields(notification, request);
        notification.setSuccessCount(Integer.valueOf(0));
        notification.setFailureCount(Integer.valueOf(0));
        notification.setLastSentAt(null);
        familyEventNotificationMapper.updateById(notification);
        return buildAdminNotification(notification, true);
    }

    @Override
    public List<Map<String, Object>> listAdminHistory() {
        LambdaQueryWrapper<FamilyEventNotification> wrapper = new LambdaQueryWrapper<FamilyEventNotification>();
        wrapper.eq(FamilyEventNotification::getDeleted, 0)
                .orderByDesc(FamilyEventNotification::getCreatedAt)
                .last("LIMIT 50");
        List<FamilyEventNotification> notifications = familyEventNotificationMapper.selectList(wrapper);
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        for (FamilyEventNotification notification : notifications) {
            result.add(buildAdminNotification(notification, true));
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> listPublicNotifications(int limit) {
        LambdaQueryWrapper<FamilyEventNotification> wrapper = new LambdaQueryWrapper<FamilyEventNotification>();
        wrapper.eq(FamilyEventNotification::getDeleted, 0)
                .in(FamilyEventNotification::getStatus, Arrays.asList(
                        NOTIFICATION_SENT,
                        NOTIFICATION_PARTIAL,
                        NOTIFICATION_FAILED,
                        NOTIFICATION_NO_RECIPIENT))
                .orderByDesc(FamilyEventNotification::getLastSentAt)
                .orderByDesc(FamilyEventNotification::getCreatedAt)
                .last("LIMIT " + safeLimit(limit));

        List<FamilyEventNotification> notifications = familyEventNotificationMapper.selectList(wrapper);
        List<Map<String, Object>> result = new ArrayList<Map<String, Object>>();
        for (FamilyEventNotification notification : notifications) {
            result.add(buildPublicNotification(notification));
        }
        return result;
    }

    @Override
    public Map<String, Object> getPublicNotification(Long notificationId) {
        if (notificationId == null || notificationId <= 0) {
            return null;
        }
        FamilyEventNotification notification = familyEventNotificationMapper.selectById(notificationId);
        if (notification == null) {
            return null;
        }
        if (notification.getDeleted() != null && notification.getDeleted().intValue() == 1) {
            return null;
        }
        if (!isPublicNotificationStatus(notification.getStatus())) {
            return null;
        }
        return buildPublicNotification(notification);
    }

    @Override
    public Map<String, Object> sendNotification(Long operatorId, Long notificationId) {
        ensureSubscriptionReady();
        if (operatorId == null || operatorId <= 0) {
            throw new IllegalStateException("请先登录");
        }
        if (notificationId == null || notificationId <= 0) {
            throw new IllegalStateException("通知 ID 无效");
        }

        FamilyEventNotification current = familyEventNotificationMapper.selectById(notificationId);
        if (current == null || (current.getDeleted() != null && current.getDeleted().intValue() == 1)) {
            throw new IllegalStateException("通知不存在");
        }
        if (!NOTIFICATION_DRAFT.equals(current.getStatus())) {
            throw new IllegalStateException("该通知已发送过，不能重复发送");
        }

        LambdaUpdateWrapper<FamilyEventNotification> lockWrapper = new LambdaUpdateWrapper<FamilyEventNotification>();
        lockWrapper.eq(FamilyEventNotification::getId, notificationId)
                .eq(FamilyEventNotification::getDeleted, 0)
                .eq(FamilyEventNotification::getStatus, NOTIFICATION_DRAFT)
                .set(FamilyEventNotification::getStatus, NOTIFICATION_SENDING);
        int locked = familyEventNotificationMapper.update(null, lockWrapper);
        if (locked <= 0) {
            throw new IllegalStateException("该通知正在发送或已被发送");
        }

        FamilyEventNotification notification = familyEventNotificationMapper.selectById(notificationId);
        int recipientCount = 0;
        int successCount = 0;
        int failureCount = 0;
        LocalDateTime sentAt = null;
        try {
            FamilyEventSubscribeProperties.TemplateConfig template = resolveTemplateConfig(notification);
            if (template == null || !hasText(template.getTemplateId())) {
                throw new IllegalStateException("该通知缺少可用模板配置");
            }

            if (!hasText(notification.getTemplateId())) {
                notification.setTemplateId(safeText(template.getTemplateId(), 128));
            }
            if (!hasText(notification.getTemplateKey())) {
                notification.setTemplateKey(safeText(template.getKey(), 32));
            }

            assembler.validateTemplateData(template, notification);

            List<User> recipients = familyEventSubscriptionMapper.selectEligibleUsers(notification.getTemplateId());
            recipientCount = recipients == null ? 0 : recipients.size();
            sentAt = LocalDateTime.now();

            if (recipientCount <= 0) {
                notification.setRecipientCount(Integer.valueOf(0));
                notification.setSuccessCount(Integer.valueOf(0));
                notification.setFailureCount(Integer.valueOf(0));
                notification.setLastSentAt(sentAt);
                notification.setStatus(NOTIFICATION_NO_RECIPIENT);
                familyEventNotificationMapper.updateById(notification);
                return buildAdminNotification(notification, true);
            }

            for (User recipient : recipients) {
                WechatSendResult sendResult = sendToRecipient(notification, recipient, template);
                persistDelivery(notification, recipient, sendResult, sentAt);

                if (sendResult.success) {
                    successCount++;
                    if (isOneTimeMode()) {
                        markSubscriptionAsUsed(recipient.getId(), recipient.getOpenid(), notification.getTemplateId());
                    }
                } else {
                    failureCount++;
                    if (assembler.isSubscriptionInvalidCode(sendResult.errorCode)) {
                        markSubscriptionAsUnavailable(recipient.getId(), recipient.getOpenid(), notification.getTemplateId(), sendResult.errorCode);
                    }
                }
            }

            notification.setRecipientCount(Integer.valueOf(recipientCount));
            notification.setSuccessCount(Integer.valueOf(successCount));
            notification.setFailureCount(Integer.valueOf(failureCount));
            notification.setLastSentAt(sentAt);
            if (successCount > 0 && failureCount > 0) {
                notification.setStatus(NOTIFICATION_PARTIAL);
            } else if (successCount > 0) {
                notification.setStatus(NOTIFICATION_SENT);
            } else {
                notification.setStatus(NOTIFICATION_FAILED);
            }
            familyEventNotificationMapper.updateById(notification);
            return buildAdminNotification(notification, true);
        } catch (Exception e) {
            log.error("send family event notification interrupted, notificationId={}", notificationId, e);
            recoverInterruptedSend(notification, recipientCount, successCount, failureCount, sentAt);
            if (e instanceof IllegalStateException) {
                throw (IllegalStateException) e;
            }
            throw new IllegalStateException(successCount + failureCount > 0
                    ? "发送过程中发生异常，请查看送达记录"
                    : "发送准备失败，请稍后重试", e);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteNotification(Long operatorId, Long notificationId) {
        if (operatorId == null || operatorId <= 0) {
            throw new IllegalStateException("请先登录");
        }
        if (notificationId == null || notificationId <= 0) {
            throw new IllegalStateException("通知 ID 无效");
        }

        FamilyEventNotification notification = familyEventNotificationMapper.selectById(notificationId);
        if (notification == null || (notification.getDeleted() != null && notification.getDeleted().intValue() == 1)) {
            throw new IllegalStateException("通知不存在");
        }
        if (NOTIFICATION_SENDING.equals(notification.getStatus())) {
            throw new IllegalStateException("通知发送中，暂不可删除");
        }

        familyEventNotificationMapper.deleteById(notificationId);
    }

    private void ensureSubscriptionReady() {
        if (!properties.isEnabled()) {
            throw new IllegalStateException("管理员尚未完成家族通知模板配置");
        }
    }

    private User requireUser(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalStateException("请先登录");
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new IllegalStateException("用户不存在");
        }
        return user;
    }

    private void applyDraftFields(FamilyEventNotification notification, FamilyEventNotificationCreateRequest request) {
        String eventType = requireText(request == null ? null : request.getEventType(), "事件类型不能为空", 20);
        FamilyEventSubscribeProperties.TemplateConfig template = properties.resolveTemplate(eventType);
        if (template == null) {
            throw new IllegalStateException("当前事件类型未配置可用模板");
        }

        notification.setTemplateKey(safeText(template.getKey(), 32));
        notification.setTemplateId(safeText(template.getTemplateId(), 128));
        notification.setEventType(eventType);
        notification.setMemberName(requireText(request == null ? null : request.getMemberName(), "相关成员不能为空", 32));
        notification.setEventTime(requireText(request == null ? null : request.getEventTime(), "事件时间不能为空", 32));
        notification.setLocation(requireText(request == null ? null : request.getLocation(), "地点或摘要不能为空", 64));
        notification.setRemark(safeText(request == null ? null : request.getRemark(), 64));
        assembler.validateTemplateData(template, notification);
        notification.setRecipientCount(Integer.valueOf(defaultNumber(
                familyEventSubscriptionMapper.countEligibleUsers(notification.getTemplateId()))));
    }

    private void upsertSubscription(User user, String templateId, String rawResult, String scene) {
        if (user == null || user.getId() == null || !hasText(templateId)) {
            return;
        }

        String subscribeStatus = assembler.normalizeSubscriptionStatus(rawResult);
        FamilyEventSubscription subscription = familyEventSubscriptionMapper.selectByUserIdAndTemplateId(user.getId(), templateId);
        if (subscription == null) {
            subscription = new FamilyEventSubscription();
            subscription.setUserId(user.getId());
            subscription.setTemplateId(templateId);
        }

        subscription.setOpenid(safeText(user.getOpenid(), 64));
        subscription.setSubscribeStatus(subscribeStatus);
        subscription.setAcceptSource(safeText(scene, 32));
        subscription.setAcceptedAt(SUBSCRIBE_ACCEPTED.equals(subscribeStatus) ? LocalDateTime.now() : null);

        if (subscription.getId() == null) {
            familyEventSubscriptionMapper.insert(subscription);
        } else {
            familyEventSubscriptionMapper.updateById(subscription);
        }
    }

    private String extractSubscribeResult(FamilyEventSubscriptionAcceptRequest request,
                                          String templateId,
                                          Map<String, String> resultMap) {
        if (resultMap != null && hasText(templateId)) {
            String raw = resultMap.get(templateId);
            if (hasText(raw)) {
                return raw;
            }
        }
        if (request != null
                && request.getAccepted() != null
                && hasText(request.getTemplateId())
                && request.getTemplateId().trim().equals(templateId)) {
            return request.getAccepted().booleanValue() ? "accept" : "reject";
        }
        return null;
    }

    private FamilyEventSubscribeProperties.TemplateConfig resolveTemplateConfig(FamilyEventNotification notification) {
        if (notification == null) {
            return null;
        }
        if (hasText(notification.getTemplateKey())) {
            FamilyEventSubscribeProperties.TemplateConfig template = properties.resolveTemplateByKey(notification.getTemplateKey());
            if (template != null) {
                return template;
            }
        }
        return properties.resolveTemplate(notification.getEventType());
    }

    private WechatSendResult sendToRecipient(FamilyEventNotification notification,
                                             User recipient,
                                             FamilyEventSubscribeProperties.TemplateConfig template) {
        if (recipient == null || recipient.getId() == null) {
            return WechatSendResult.failed(Integer.valueOf(-1), "接收用户不存在");
        }
        if (!hasText(recipient.getOpenid())) {
            return WechatSendResult.failed(Integer.valueOf(40003), "用户缺少 openid");
        }

        Map<String, Object> payload = assembler.buildSendPayload(template, notification, recipient.getOpenid());
        WechatSendResult result = doSend(payload, false);
        if (!result.success && result.errorCode != null
                && (result.errorCode.intValue() == 40001 || result.errorCode.intValue() == 42001)) {
            accessTokenService.invalidate();
            result = doSend(payload, true);
        }
        return result;
    }

    private WechatSendResult doSend(Map<String, Object> payload, boolean refreshed) {
        try {
            String accessToken = refreshed ? accessTokenService.refreshAccessToken() : accessTokenService.getAccessToken();
            String url = "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=" + accessToken;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<Map<String, Object>>(payload, headers);

            RestTemplate restTemplate = new RestTemplate();
            String responseStr = restTemplate.postForObject(url, entity, String.class);
            Map<String, Object> response = objectMapper.readValue(responseStr, Map.class);

            Integer errcode = toInteger(response.get("errcode"));
            if (errcode == null || errcode.intValue() == 0) {
                return WechatSendResult.success(asString(response.get("msgid")));
            }
            return WechatSendResult.failed(errcode, asString(response.get("errmsg")));
        } catch (Exception e) {
            log.error("send family event subscribe message failed", e);
            return WechatSendResult.failed(Integer.valueOf(-1), e.getMessage());
        }
    }

    private void persistDelivery(FamilyEventNotification notification,
                                 User recipient,
                                 WechatSendResult sendResult,
                                 LocalDateTime sentAt) {
        FamilyEventNotificationDelivery delivery = new FamilyEventNotificationDelivery();
        delivery.setNotificationId(notification.getId());
        delivery.setUserId(recipient == null ? null : recipient.getId());
        delivery.setOpenid(safeText(recipient == null ? null : recipient.getOpenid(), 64));
        delivery.setTemplateId(safeText(notification == null ? null : notification.getTemplateId(), 128));
        delivery.setSendStatus(sendResult.success ? DELIVERY_SUCCESS : DELIVERY_FAILED);
        delivery.setErrorCode(sendResult.errorCode);
        delivery.setErrorMessage(safeText(sendResult.errorMessage, 255));
        delivery.setMsgId(safeText(sendResult.msgId, 64));
        delivery.setSentAt(sentAt);
        try {
            familyEventNotificationDeliveryMapper.insert(delivery);
        } catch (Exception e) {
            LambdaQueryWrapper<FamilyEventNotificationDelivery> wrapper = new LambdaQueryWrapper<FamilyEventNotificationDelivery>();
            wrapper.eq(FamilyEventNotificationDelivery::getNotificationId, delivery.getNotificationId())
                    .eq(FamilyEventNotificationDelivery::getUserId, delivery.getUserId())
                    .last("LIMIT 1");
            FamilyEventNotificationDelivery existing = familyEventNotificationDeliveryMapper.selectOne(wrapper);
            if (existing != null) {
                delivery.setId(existing.getId());
                familyEventNotificationDeliveryMapper.updateById(delivery);
                return;
            }
            log.error("persist family event delivery failed, notificationId={}, userId={}",
                    notification == null ? null : notification.getId(),
                    recipient == null ? null : recipient.getId(),
                    e);
            throw new IllegalStateException("保存发送记录失败", e);
        }
    }

    private void markSubscriptionAsUnavailable(Long userId, String openid, String templateId, Integer errorCode) {
        if (userId == null || userId <= 0 || !hasText(templateId)) {
            return;
        }
        FamilyEventSubscription subscription = familyEventSubscriptionMapper.selectByUserIdAndTemplateId(userId, templateId);
        if (subscription == null) {
            return;
        }

        if (errorCode != null && errorCode.intValue() == 40003) {
            subscription.setSubscribeStatus(SUBSCRIBE_INVALID_OPENID);
        } else {
            subscription.setSubscribeStatus(SUBSCRIBE_REJECTED);
        }
        subscription.setOpenid(safeText(openid, 64));
        subscription.setAcceptedAt(null);
        familyEventSubscriptionMapper.updateById(subscription);
    }

    private void markSubscriptionAsUsed(Long userId, String openid, String templateId) {
        if (userId == null || userId <= 0 || !hasText(templateId)) {
            return;
        }
        FamilyEventSubscription subscription = familyEventSubscriptionMapper.selectByUserIdAndTemplateId(userId, templateId);
        if (subscription == null) {
            return;
        }
        subscription.setSubscribeStatus(SUBSCRIBE_USED);
        subscription.setOpenid(safeText(openid, 64));
        familyEventSubscriptionMapper.updateById(subscription);
    }

    private void recoverInterruptedSend(FamilyEventNotification notification,
                                        int recipientCount,
                                        int successCount,
                                        int failureCount,
                                        LocalDateTime sentAt) {
        if (notification == null || notification.getId() == null) {
            return;
        }
        try {
            FamilyEventNotification latest = familyEventNotificationMapper.selectById(notification.getId());
            if (latest == null || !NOTIFICATION_SENDING.equals(latest.getStatus())) {
                return;
            }

            if (successCount + failureCount <= 0) {
                LambdaUpdateWrapper<FamilyEventNotification> resetWrapper = new LambdaUpdateWrapper<FamilyEventNotification>();
                resetWrapper.eq(FamilyEventNotification::getId, notification.getId())
                        .eq(FamilyEventNotification::getStatus, NOTIFICATION_SENDING)
                        .set(FamilyEventNotification::getStatus, NOTIFICATION_DRAFT);
                familyEventNotificationMapper.update(null, resetWrapper);
                return;
            }

            latest.setRecipientCount(Integer.valueOf(recipientCount));
            latest.setSuccessCount(Integer.valueOf(successCount));
            latest.setFailureCount(Integer.valueOf(failureCount));
            latest.setLastSentAt(sentAt == null ? LocalDateTime.now() : sentAt);
            if (successCount > 0 && failureCount > 0) {
                latest.setStatus(NOTIFICATION_PARTIAL);
            } else if (successCount > 0 && successCount >= recipientCount) {
                latest.setStatus(NOTIFICATION_SENT);
            } else {
                latest.setStatus(NOTIFICATION_FAILED);
            }
            familyEventNotificationMapper.updateById(latest);
        } catch (Exception ex) {
            log.error("recover family event notification status failed, notificationId={}",
                    notification.getId(),
                    ex);
        }
    }

    private Map<String, Object> buildAdminNotification(FamilyEventNotification notification, boolean includeFailures) {
        Map<String, Object> result = buildPublicNotification(notification);
        result.put("statusText", buildAdminNotificationStatusText(notification == null ? null : notification.getStatus()));
        result.put("recipientCount", Integer.valueOf(defaultNumber(notification == null ? null : notification.getRecipientCount())));
        result.put("successCount", Integer.valueOf(defaultNumber(notification == null ? null : notification.getSuccessCount())));
        result.put("failureCount", Integer.valueOf(defaultNumber(notification == null ? null : notification.getFailureCount())));
        result.put("estimatedRecipientCount", Integer.valueOf(defaultNumber(notification == null ? null : notification.getRecipientCount())));
        result.put("canSend", Boolean.valueOf(notification != null && NOTIFICATION_DRAFT.equals(notification.getStatus())));
        result.put("canDelete", Boolean.valueOf(notification != null && !NOTIFICATION_SENDING.equals(notification.getStatus())));
        if (includeFailures && notification != null && notification.getId() != null) {
            result.put("failureReasons", loadFailureReasons(notification.getId()));
        } else {
            result.put("failureReasons", new ArrayList<Map<String, Object>>());
        }
        return result;
    }

    private Map<String, Object> buildPublicNotification(FamilyEventNotification notification) {
        Map<String, Object> result = new LinkedHashMap<String, Object>();
        if (notification == null) {
            return result;
        }

        FamilyEventSubscribeProperties.TemplateConfig template = resolveTemplateConfig(notification);
        result.put("id", notification.getId());
        result.put("templateKey", notification.getTemplateKey());
        result.put("templateId", notification.getTemplateId());
        result.put("templateTitle", template == null ? null : template.getTitle());
        result.put("eventType", notification.getEventType());
        result.put("memberName", notification.getMemberName());
        result.put("eventTime", notification.getEventTime());
        result.put("location", notification.getLocation());
        result.put("remark", notification.getRemark());
        result.put("status", notification.getStatus());
        result.put("statusText", buildPublicNotificationStatusText(notification.getStatus()));
        result.put("lastSentAt", notification.getLastSentAt());
        result.put("createdAt", notification.getCreatedAt());
        return result;
    }

    private boolean isPublicNotificationStatus(String status) {
        return NOTIFICATION_SENT.equals(status)
                || NOTIFICATION_PARTIAL.equals(status)
                || NOTIFICATION_FAILED.equals(status)
                || NOTIFICATION_NO_RECIPIENT.equals(status);
    }

    private List<Map<String, Object>> loadFailureReasons(Long notificationId) {
        List<Map<String, Object>> items = new ArrayList<Map<String, Object>>();
        LambdaQueryWrapper<FamilyEventNotificationDelivery> wrapper = new LambdaQueryWrapper<FamilyEventNotificationDelivery>();
        wrapper.eq(FamilyEventNotificationDelivery::getNotificationId, notificationId)
                .eq(FamilyEventNotificationDelivery::getSendStatus, DELIVERY_FAILED)
                .orderByDesc(FamilyEventNotificationDelivery::getId)
                .last("LIMIT 3");

        List<FamilyEventNotificationDelivery> deliveries = familyEventNotificationDeliveryMapper.selectList(wrapper);
        for (FamilyEventNotificationDelivery delivery : deliveries) {
            Map<String, Object> item = new LinkedHashMap<String, Object>();
            item.put("userId", delivery.getUserId());
            item.put("errorCode", delivery.getErrorCode());
            item.put("errorMessage", delivery.getErrorMessage());
            item.put("sentAt", delivery.getSentAt());
            items.add(item);
        }
        return items;
    }

    private String buildSingleTemplateStatusText(String status) {
        if (SUBSCRIBE_ACCEPTED.equals(status)) {
            return isOneTimeMode() ? "已获取下一次通知授权" : "已开启通知";
        }
        if (SUBSCRIBE_REJECTED.equals(status)) {
            return "已拒绝，可重新授权";
        }
        if (SUBSCRIBE_BANNED.equals(status)) {
            return "微信限制该模板订阅";
        }
        if (SUBSCRIBE_FILTERED.equals(status)) {
            return "微信已过滤该模板";
        }
        if (SUBSCRIBE_INVALID_OPENID.equals(status)) {
            return "当前微信身份信息已失效";
        }
        if (SUBSCRIBE_USED.equals(status)) {
            return "本次授权已消耗";
        }
        return "尚未授权";
    }

    private String buildAggregateSubscriptionStatus(int acceptedCount, int enabledCount) {
        if (enabledCount <= 0 || acceptedCount <= 0) {
            return SUBSCRIBE_NONE;
        }
        if (acceptedCount >= enabledCount) {
            return SUBSCRIBE_ACCEPTED;
        }
        return SUBSCRIBE_PARTIAL;
    }

    private String buildAggregateSubscriptionStatusText(int acceptedCount, int enabledCount) {
        if (enabledCount <= 0) {
            return "管理员尚未配置通知模板";
        }
        if (acceptedCount <= 0) {
            return isOneTimeMode() ? "尚未获取任何通知授权" : "尚未开启家族大事通知";
        }
        if (acceptedCount >= enabledCount) {
            return isOneTimeMode() ? "已获取全部通知模板的下一次授权" : "已开启全部家族通知";
        }
        return isOneTimeMode()
                ? "已获取部分通知模板授权（" + acceptedCount + "/" + enabledCount + "）"
                : "已开启部分家族通知（" + acceptedCount + "/" + enabledCount + "）";
    }

    private String buildPublicNotificationStatusText(String status) {
        if (isPublicNotificationStatus(status)) {
            return "已发布";
        }
        if (NOTIFICATION_DRAFT.equals(status)) {
            return "待发布";
        }
        if (NOTIFICATION_SENDING.equals(status)) {
            return "发布中";
        }
        return "家族通知";
    }

    private String buildAdminNotificationStatusText(String status) {
        if (NOTIFICATION_DRAFT.equals(status)) {
            return "待发送";
        }
        if (NOTIFICATION_SENDING.equals(status)) {
            return "发送中";
        }
        if (NOTIFICATION_SENT.equals(status)) {
            return "发送成功";
        }
        if (NOTIFICATION_PARTIAL.equals(status)) {
            return "微信提醒部分成功";
        }
        if (NOTIFICATION_FAILED.equals(status)) {
            return "仅站内发布";
        }
        if (NOTIFICATION_NO_RECIPIENT.equals(status)) {
            return "仅站内发布";
        }
        return "未知状态";
    }

    private List<String> resolveEventTypes(String templateKey) {
        List<String> items = new ArrayList<String>();
        if (!hasText(templateKey) || properties.getEventRoutes() == null || properties.getEventRoutes().isEmpty()) {
            return items;
        }
        for (Map.Entry<String, String> entry : properties.getEventRoutes().entrySet()) {
            if (templateKey.trim().equals(entry.getValue())) {
                items.add(entry.getKey());
            }
        }
        return items;
    }

    private String requireText(String value, String message, int maxLength) {
        String text = safeText(value, maxLength);
        if (!hasText(text)) {
            throw new IllegalStateException(message);
        }
        return text;
    }

    private String safeText(String value, int maxLength) {
        if (!hasText(value)) {
            return null;
        }
        String text = value.trim();
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean isOneTimeMode() {
        return "one_time".equalsIgnoreCase(safeText(properties.getMode(), 32));
    }

    private int defaultNumber(Integer value) {
        return value == null ? 0 : value.intValue();
    }

    private int safeLimit(int limit) {
        if (limit <= 0) {
            return 20;
        }
        return Math.min(limit, 100);
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return Integer.valueOf(((Number) value).intValue());
        }
        try {
            return Integer.valueOf(Integer.parseInt(String.valueOf(value).trim()));
        } catch (Exception ignored) {
            return null;
        }
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static class WechatSendResult {
        private final boolean success;
        private final Integer errorCode;
        private final String errorMessage;
        private final String msgId;

        private WechatSendResult(boolean success, Integer errorCode, String errorMessage, String msgId) {
            this.success = success;
            this.errorCode = errorCode;
            this.errorMessage = errorMessage;
            this.msgId = msgId;
        }

        private static WechatSendResult success(String msgId) {
            return new WechatSendResult(true, null, null, msgId);
        }

        private static WechatSendResult failed(Integer errorCode, String errorMessage) {
            return new WechatSendResult(false, errorCode, errorMessage, null);
        }
    }
}
