package com.familytree.util;

import com.familytree.config.FamilyEventSubscribeProperties;
import com.familytree.entity.FamilyEventNotification;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.Map;

class FamilyEventSubscribeMessageAssemblerTests {

    private final FamilyEventSubscribeMessageAssembler assembler = new FamilyEventSubscribeMessageAssembler();

    @Test
    void shouldBuildWechatPayloadWithConfiguredKeys() {
        FamilyEventSubscribeProperties properties = new FamilyEventSubscribeProperties();
        FamilyEventSubscribeProperties.Keys keys = new FamilyEventSubscribeProperties.Keys();
        keys.setEventType("phrase01");
        keys.setMemberName("name01");
        keys.setEventTime("date01");
        keys.setLocation("thing01");
        keys.setRemark("thing02");
        properties.setDefaultTemplate("general");
        properties.getTemplates().put("general", createTemplate("template-001", "pages/notification/history/history", keys));

        FamilyEventNotification notification = new FamilyEventNotification();
        notification.setId(12L);
        notification.setEventType("婚礼");
        notification.setMemberName("张三");
        notification.setEventTime("2026-04-20 10:30");
        notification.setLocation("宗祠广场");
        notification.setRemark("请提前半小时到场");

        Map<String, Object> payload = assembler.buildSendPayload(properties, notification, "openid-123");
        Map<String, Map<String, String>> data = (Map<String, Map<String, String>>) payload.get("data");

        Assertions.assertEquals("openid-123", payload.get("touser"));
        Assertions.assertEquals("template-001", payload.get("template_id"));
        Assertions.assertEquals("pages/notification/history/history?notificationId=12", payload.get("page"));
        Assertions.assertEquals("婚礼", data.get("phrase01").get("value"));
        Assertions.assertEquals("张三", data.get("name01").get("value"));
        Assertions.assertEquals("2026-04-20 10:30", data.get("date01").get("value"));
        Assertions.assertEquals("宗祠广场", data.get("thing01").get("value"));
        Assertions.assertEquals("请提前半小时到场", data.get("thing02").get("value"));
    }

    @Test
    void shouldMergeFieldsWhenTemplateHasFewerKeywords() {
        FamilyEventSubscribeProperties properties = new FamilyEventSubscribeProperties();
        FamilyEventSubscribeProperties.Keys keys = new FamilyEventSubscribeProperties.Keys();
        keys.setEventType("thing01");
        keys.setEventTime("date02");
        keys.setLocation("thing03");
        properties.setDefaultTemplate("general");
        properties.getTemplates().put("general", createTemplate("template-002", null, keys));

        FamilyEventNotification notification = new FamilyEventNotification();
        notification.setEventType("婚礼");
        notification.setMemberName("张三");
        notification.setEventTime("2026-04-20 10:30");
        notification.setLocation("祖屋");
        notification.setRemark("准时到");

        Map<String, Map<String, String>> data = assembler.buildData(properties, notification);
        Assertions.assertEquals("婚礼·张三", data.get("thing01").get("value"));
        Assertions.assertEquals("2026-04-20 10:30", data.get("date02").get("value"));
        Assertions.assertEquals("祖屋；准时到", data.get("thing03").get("value"));
    }

    @Test
    void shouldPreferLocationWhenSingleThingFieldCannotHoldLocationAndRemarkTogether() {
        FamilyEventSubscribeProperties.TemplateConfig template = new FamilyEventSubscribeProperties.TemplateConfig();
        template.setTemplateId("template-004");

        FamilyEventSubscribeProperties.Keys keys = new FamilyEventSubscribeProperties.Keys();
        keys.setLocation("thing03");
        template.setKeys(keys);

        FamilyEventNotification notification = new FamilyEventNotification();
        notification.setLocation("随州市府河镇涛涛平酒楼二楼宴会厅");
        notification.setRemark("请提前半小时到场");

        Map<String, Map<String, String>> data = assembler.buildData(template, notification);

        Assertions.assertEquals("随州市府河镇涛涛平酒楼二楼宴会厅", data.get("thing03").get("value"));
        Assertions.assertDoesNotThrow(() -> assembler.validateTemplateData(template, notification));
    }

    @Test
    void shouldRejectOverlongThingFieldBeforeSending() {
        FamilyEventSubscribeProperties.TemplateConfig template = new FamilyEventSubscribeProperties.TemplateConfig();
        template.setTemplateId("template-003");

        FamilyEventSubscribeProperties.Keys keys = new FamilyEventSubscribeProperties.Keys();
        keys.setEventType("thing01");
        template.setKeys(keys);

        FamilyEventNotification notification = new FamilyEventNotification();
        notification.setEventType("这是一个明显超过模板长度限制的超长事件名称");
        notification.setMemberName("张三");

        IllegalStateException exception = Assertions.assertThrows(
                IllegalStateException.class,
                () -> assembler.validateTemplateData(template, notification)
        );
        Assertions.assertTrue(exception.getMessage().contains("超出模板长度限制"));
    }

    @Test
    void shouldNormalizeSubscribeStatus() {
        Assertions.assertEquals("ACCEPTED", assembler.normalizeSubscriptionStatus("accept"));
        Assertions.assertEquals("REJECTED", assembler.normalizeSubscriptionStatus("reject"));
        Assertions.assertEquals("BANNED", assembler.normalizeSubscriptionStatus("ban"));
        Assertions.assertEquals("FILTERED", assembler.normalizeSubscriptionStatus("filter"));
        Assertions.assertEquals("UNKNOWN", assembler.normalizeSubscriptionStatus("something-else"));
        Assertions.assertEquals("NONE", assembler.normalizeSubscriptionStatus(null));
    }

    @Test
    void shouldRecognizeInvalidSubscriptionCodes() {
        Assertions.assertTrue(assembler.isSubscriptionInvalidCode(Integer.valueOf(40003)));
        Assertions.assertTrue(assembler.isSubscriptionInvalidCode(Integer.valueOf(43004)));
        Assertions.assertTrue(assembler.isSubscriptionInvalidCode(Integer.valueOf(43101)));
        Assertions.assertFalse(assembler.isSubscriptionInvalidCode(Integer.valueOf(47003)));
    }

    private FamilyEventSubscribeProperties.TemplateConfig createTemplate(String templateId,
                                                                        String page,
                                                                        FamilyEventSubscribeProperties.Keys keys) {
        FamilyEventSubscribeProperties.TemplateConfig template = new FamilyEventSubscribeProperties.TemplateConfig();
        template.setTemplateId(templateId);
        template.setPage(page);
        template.setKeys(keys);
        return template;
    }
}
