package com.familytree.util;

import com.familytree.config.FamilyEventSubscribeProperties;
import com.familytree.entity.FamilyEventNotification;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

public class FamilyEventSubscribeMessageAssembler {

    public Map<String, Object> buildSendPayload(FamilyEventSubscribeProperties properties,
                                                FamilyEventNotification notification,
                                                String openid) {
        FamilyEventSubscribeProperties.TemplateConfig template = properties == null
                ? null
                : properties.resolveTemplate(notification == null ? null : notification.getEventType());
        return buildSendPayload(template, notification, openid);
    }

    public Map<String, Object> buildSendPayload(FamilyEventSubscribeProperties.TemplateConfig template,
                                                FamilyEventNotification notification,
                                                String openid) {
        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("touser", openid);
        payload.put("template_id", template == null ? null : template.getTemplateId());

        String page = appendNotificationId(template == null ? null : template.getPage(), notification == null ? null : notification.getId());
        if (hasText(page)) {
            payload.put("page", page);
        }

        payload.put("data", buildData(template, notification));
        return payload;
    }

    public Map<String, Map<String, String>> buildData(FamilyEventSubscribeProperties properties,
                                                      FamilyEventNotification notification) {
        FamilyEventSubscribeProperties.TemplateConfig template = properties == null
                ? null
                : properties.resolveTemplate(notification == null ? null : notification.getEventType());
        return buildData(template, notification);
    }

    public Map<String, Map<String, String>> buildData(FamilyEventSubscribeProperties.TemplateConfig template,
                                                      FamilyEventNotification notification) {
        Map<String, Map<String, String>> data = new LinkedHashMap<String, Map<String, String>>();
        if (template == null || template.getKeys() == null || notification == null) {
            return data;
        }

        Map<String, String> renderedValues = buildRenderedValues(template, notification);
        for (Map.Entry<String, String> entry : renderedValues.entrySet()) {
            putValue(data, entry.getKey(), entry.getValue());
        }
        return data;
    }

    public void validateTemplateData(FamilyEventSubscribeProperties.TemplateConfig template,
                                     FamilyEventNotification notification) {
        Map<String, String> renderedValues = buildRenderedValues(template, notification);
        for (Map.Entry<String, String> entry : renderedValues.entrySet()) {
            String sanitizedValue = sanitizeValueForKey(entry.getKey(), entry.getValue());
            String trimmedValue = hasText(entry.getValue()) ? entry.getValue().trim() : null;
            if (trimmedValue != null && !trimmedValue.equals(sanitizedValue)) {
                throw new IllegalStateException(buildLengthViolationMessage(template, entry.getKey()));
            }
        }
    }

    public String appendNotificationId(String page, Long notificationId) {
        if (!hasText(page)) {
            return null;
        }
        if (notificationId == null || notificationId <= 0) {
            return page.trim();
        }
        return page.contains("?")
                ? page.trim() + "&notificationId=" + notificationId
                : page.trim() + "?notificationId=" + notificationId;
    }

    public String normalizeSubscriptionStatus(String result) {
        if (!hasText(result)) {
            return "NONE";
        }
        String normalized = result.trim().toLowerCase();
        if ("accept".equals(normalized)) {
            return "ACCEPTED";
        }
        if ("reject".equals(normalized)) {
            return "REJECTED";
        }
        if ("ban".equals(normalized)) {
            return "BANNED";
        }
        if ("filter".equals(normalized)) {
            return "FILTERED";
        }
        return "UNKNOWN";
    }

    public boolean isAcceptedResult(String result) {
        return "ACCEPTED".equals(normalizeSubscriptionStatus(result));
    }

    public boolean isSubscriptionInvalidCode(Integer code) {
        return code != null
                && (code.intValue() == 40003
                || code.intValue() == 43004
                || code.intValue() == 43101);
    }

    public String buildTitle(String eventType, String memberName) {
        if (hasText(eventType) && hasText(memberName)) {
            return eventType.trim() + "·" + memberName.trim();
        }
        if (hasText(eventType)) {
            return eventType.trim();
        }
        return hasText(memberName) ? memberName.trim() : null;
    }

    public String buildReminder(String location, String remark) {
        String safeLocation = hasText(location) ? location.trim() : null;
        String safeRemark = hasText(remark) ? remark.trim() : null;
        if (hasText(safeLocation) && hasText(safeRemark)) {
            return "地点：" + safeLocation + "；" + safeRemark;
        }
        if (hasText(safeLocation)) {
            return "地点：" + safeLocation;
        }
        return safeRemark;
    }

    private Map<String, String> buildRenderedValues(FamilyEventSubscribeProperties.TemplateConfig template,
                                                    FamilyEventNotification notification) {
        Map<String, String> values = new LinkedHashMap<String, String>();
        if (template == null || template.getKeys() == null || notification == null) {
            return values;
        }

        String titleText = buildTitle(notification.getEventType(), notification.getMemberName());
        String reminderText = buildReminder(notification.getLocation(), notification.getRemark());
        String singleFieldReminder = buildSingleFieldReminder(
                template.getKeys().getLocation(),
                notification.getLocation(),
                notification.getRemark());

        if (hasText(template.getKeys().getEventType())) {
            values.put(template.getKeys().getEventType(),
                    hasText(template.getKeys().getMemberName()) ? notification.getEventType() : titleText);
        }
        if (hasText(template.getKeys().getMemberName())) {
            values.put(template.getKeys().getMemberName(),
                    hasText(notification.getMemberName()) ? notification.getMemberName() : notification.getEventType());
        }
        if (hasText(template.getKeys().getEventTime())) {
            values.put(template.getKeys().getEventTime(), notification.getEventTime());
        }
        if (hasText(template.getKeys().getLocation())) {
            values.put(template.getKeys().getLocation(),
                    hasText(template.getKeys().getRemark()) ? notification.getLocation() : singleFieldReminder);
        }
        if (hasText(template.getKeys().getRemark())) {
            values.put(template.getKeys().getRemark(),
                    hasText(notification.getRemark()) ? notification.getRemark() : reminderText);
        }
        return values;
    }

    private void putValue(Map<String, Map<String, String>> data, String key, String value) {
        String sanitizedValue = sanitizeValueForKey(key, value);
        if (!hasText(key) || !hasText(sanitizedValue)) {
            return;
        }
        Map<String, String> entry = new HashMap<String, String>();
        entry.put("value", sanitizedValue);
        data.put(key.trim(), entry);
    }

    private String sanitizeValueForKey(String key, String value) {
        return safeText(value, maxLengthForKey(key));
    }

    private int maxLengthForKey(String key) {
        String normalizedKey = normalizeKey(key);
        if (normalizedKey.startsWith("phrase")) {
            return 5;
        }
        if (normalizedKey.startsWith("name")) {
            return 10;
        }
        if (normalizedKey.startsWith("thing")) {
            return 20;
        }
        if (normalizedKey.startsWith("time") || normalizedKey.startsWith("date")) {
            return 32;
        }
        if (normalizedKey.startsWith("character_string")) {
            return 32;
        }
        return 32;
    }

    private String buildLengthViolationMessage(FamilyEventSubscribeProperties.TemplateConfig template, String key) {
        return resolveFieldLabel(template, key) + "超出模板长度限制，请精简后重试";
    }

    private String resolveFieldLabel(FamilyEventSubscribeProperties.TemplateConfig template, String key) {
        if (template == null || template.getKeys() == null || !hasText(key)) {
            return "通知内容";
        }
        String normalizedKey = normalizeKey(key);
        if (normalizedKey.equals(normalizeKey(template.getKeys().getMemberName()))) {
            return "涉及成员";
        }
        if (normalizedKey.equals(normalizeKey(template.getKeys().getEventTime()))) {
            return "事件时间";
        }
        if (normalizedKey.equals(normalizeKey(template.getKeys().getLocation()))) {
            return hasText(template.getKeys().getRemark()) ? "地点或摘要" : "地点或备注";
        }
        if (normalizedKey.equals(normalizeKey(template.getKeys().getRemark()))) {
            return "备注";
        }
        return hasText(template.getKeys().getMemberName()) ? "事件类型" : "活动名称";
    }

    private String buildSingleFieldReminder(String key, String location, String remark) {
        String safeLocation = hasText(location) ? location.trim() : null;
        String safeRemark = hasText(remark) ? remark.trim() : null;
        if (hasText(safeLocation) && hasText(safeRemark)) {
            String merged = safeLocation + "；" + safeRemark;
            if (fitsKeyLength(key, merged)) {
                return merged;
            }
            return safeLocation;
        }
        if (hasText(safeLocation)) {
            return safeLocation;
        }
        return safeRemark;
    }

    private String normalizeKey(String key) {
        if (!hasText(key)) {
            return "";
        }
        String normalized = key.trim().toLowerCase();
        int dotIndex = normalized.indexOf('.');
        if (dotIndex > 0) {
            normalized = normalized.substring(0, dotIndex);
        }
        return normalized;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean fitsKeyLength(String key, String value) {
        return !hasText(value) || value.trim().length() <= maxLengthForKey(key);
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
}
