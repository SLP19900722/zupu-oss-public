package com.familytree.dto.notification;

import lombok.Data;

import java.util.Map;

@Data
public class FamilyEventSubscriptionAcceptRequest {

    private String templateId;

    private String scene;

    private Boolean accepted;

    private Map<String, String> result;
}
