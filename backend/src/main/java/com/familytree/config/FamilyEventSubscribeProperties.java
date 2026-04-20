package com.familytree.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@Component
@ConfigurationProperties(prefix = "familytree.wechat.subscribe.family-event")
public class FamilyEventSubscribeProperties {

    private String mode = "one_time";

    private String defaultTemplate = "general";

    private Map<String, String> eventRoutes = new LinkedHashMap<String, String>();

    private Map<String, TemplateConfig> templates = new LinkedHashMap<String, TemplateConfig>();

    public boolean isEnabled() {
        return resolveDefaultTemplate() != null;
    }

    public TemplateConfig resolveTemplate(String eventType) {
        String routeKey = null;
        if (hasText(eventType)) {
            routeKey = eventRoutes.get(eventType.trim());
        }
        if (hasText(routeKey)) {
            TemplateConfig routedTemplate = resolveTemplateByKey(routeKey);
            if (routedTemplate != null) {
                return routedTemplate;
            }
        }
        return resolveDefaultTemplate();
    }

    public TemplateConfig resolveDefaultTemplate() {
        if (hasText(defaultTemplate)) {
            TemplateConfig template = resolveTemplateByKey(defaultTemplate);
            if (template != null) {
                return template;
            }
        }
        if (templates == null || templates.isEmpty()) {
            return null;
        }
        for (Map.Entry<String, TemplateConfig> entry : templates.entrySet()) {
            if (entry.getValue() != null && entry.getValue().isEnabled()) {
                entry.getValue().setKey(entry.getKey());
                return entry.getValue();
            }
        }
        return null;
    }

    public TemplateConfig resolveTemplateByKey(String key) {
        if (!hasText(key) || templates == null || templates.isEmpty()) {
            return null;
        }
        TemplateConfig template = templates.get(key.trim());
        if (template == null || !template.isEnabled()) {
            return null;
        }
        template.setKey(key.trim());
        return template;
    }

    public List<TemplateConfig> getEnabledTemplates() {
        List<TemplateConfig> result = new ArrayList<TemplateConfig>();
        if (templates == null || templates.isEmpty()) {
            return result;
        }
        for (Map.Entry<String, TemplateConfig> entry : templates.entrySet()) {
            if (entry.getValue() == null || !entry.getValue().isEnabled()) {
                continue;
            }
            entry.getValue().setKey(entry.getKey());
            result.add(entry.getValue());
        }
        return result;
    }

    public List<String> getEnabledTemplateIds() {
        List<String> result = new ArrayList<String>();
        for (TemplateConfig template : getEnabledTemplates()) {
            if (template == null || !hasText(template.getTemplateId())) {
                continue;
            }
            if (!result.contains(template.getTemplateId().trim())) {
                result.add(template.getTemplateId().trim());
            }
        }
        return result;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    @Data
    public static class TemplateConfig {
        private String key;
        private boolean active = true;
        private String title;
        private String templateId;
        private String page = "pages/notification/history/history";
        private Keys keys = new Keys();

        public boolean isEnabled() {
            return active
                    && hasText(templateId)
                    && keys != null
                    && hasText(keys.getEventTime())
                    && (hasText(keys.getEventType())
                    || hasText(keys.getMemberName())
                    || hasText(keys.getLocation())
                    || hasText(keys.getRemark()));
        }

        private boolean hasText(String value) {
            return value != null && !value.trim().isEmpty();
        }
    }

    @Data
    public static class Keys {
        private String eventType;
        private String memberName;
        private String eventTime;
        private String location;
        private String remark;
    }
}
