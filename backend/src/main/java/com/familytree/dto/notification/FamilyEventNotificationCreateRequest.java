package com.familytree.dto.notification;

import lombok.Data;

@Data
public class FamilyEventNotificationCreateRequest {

    private String eventType;

    private String memberName;

    private String eventTime;

    private String location;

    private String remark;
}
