package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.AuditRecord;
import com.familytree.entity.FamilyMember;
import com.familytree.entity.User;
import com.familytree.service.AuditService;
import com.familytree.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/audit")
public class AuditController {

    @Autowired
    private AuditService auditService;

    @Autowired
    private AuthService authService;

    @GetMapping("/pending")
    public Result<List<Map<String, Object>>> getPendingAudits(@RequestHeader("Authorization") String authorization) {
        try {
            String token = authorization.replace("Bearer ", "");
            Integer role = authService.getCurrentUserRole(token);
            if (role == null || role < 1) {
                return Result.error("No permission");
            }

            List<Map<String, Object>> items = new ArrayList<>();
            for (FamilyMember member : auditService.getPendingMembers()) {
                items.add(buildPendingMemberItem(member));
            }
            items.addAll(authService.getPendingIdentityBindingAudits());

            items.sort(new Comparator<Map<String, Object>>() {
                @Override
                public int compare(Map<String, Object> left, Map<String, Object> right) {
                    LocalDateTime leftTime = (LocalDateTime) left.get("submittedAt");
                    LocalDateTime rightTime = (LocalDateTime) right.get("submittedAt");
                    if (leftTime == null && rightTime == null) {
                        return 0;
                    }
                    if (leftTime == null) {
                        return 1;
                    }
                    if (rightTime == null) {
                        return -1;
                    }
                    return rightTime.compareTo(leftTime);
                }
            });

            return Result.success(items);
        } catch (Exception e) {
            log.error("get pending audits failed", e);
            return Result.error("Failed to fetch pending audits");
        }
    }

    @PostMapping("/member/{id}")
    public Result<String> auditMember(@PathVariable Long id,
                                      @RequestBody Map<String, Object> params,
                                      @RequestHeader("Authorization") String authorization) {
        try {
            String token = authorization.replace("Bearer ", "");
            User auditor = authService.getCurrentUserByToken(token);
            Long auditorId = auditor == null ? null : auditor.getId();
            Integer role = auditor == null ? null : auditor.getRole();
            if (role == null || role < 1) {
                return Result.error("No permission");
            }

            Integer status = parseInteger(params.get("status"));
            String remark = params.get("remark") == null ? null : String.valueOf(params.get("remark"));
            boolean success = auditService.auditMember(id, status, remark, auditorId);
            return success ? Result.success("Audit completed") : Result.error("Audit failed");
        } catch (Exception e) {
            log.error("audit member failed", e);
            return Result.error("Audit failed: " + e.getMessage());
        }
    }

    @PostMapping("/identity-binding/{recordId}")
    public Result<String> auditIdentityBinding(@PathVariable Long recordId,
                                               @RequestBody Map<String, Object> params,
                                               @RequestHeader("Authorization") String authorization) {
        try {
            String token = authorization.replace("Bearer ", "");
            User auditor = authService.getCurrentUserByToken(token);
            Long auditorId = auditor == null ? null : auditor.getId();
            Integer role = auditor == null ? null : auditor.getRole();
            if (role == null || role < 1) {
                return Result.error("No permission");
            }

            Integer status = parseInteger(params.get("status"));
            String remark = params.get("remark") == null ? null : String.valueOf(params.get("remark"));
            boolean success = authService.auditIdentityBinding(recordId, status, remark, auditorId);
            return success ? Result.success("Audit completed") : Result.error("Audit failed");
        } catch (Exception e) {
            log.error("audit identity binding failed", e);
            return Result.error("Audit failed: " + e.getMessage());
        }
    }

    @GetMapping("/history")
    public Result<List<AuditRecord>> getAuditHistory(@RequestParam(required = false) Long memberId,
                                                     @RequestHeader("Authorization") String authorization) {
        try {
            String token = authorization.replace("Bearer ", "");
            Integer role = authService.getCurrentUserRole(token);
            if (role == null || role < 1) {
                return Result.error("No permission");
            }
            return Result.success(auditService.getAuditHistory(memberId));
        } catch (Exception e) {
            log.error("get audit history failed", e);
            return Result.error("Failed to fetch audit history");
        }
    }

    @PostMapping("/submit")
    public Result<Long> submitAudit(@RequestBody FamilyMember member,
                                    @RequestHeader("Authorization") String authorization) {
        try {
            String token = authorization.replace("Bearer ", "");
            User user = authService.getCurrentUserByToken(token);
            Long userId = user == null ? null : user.getId();
            Integer role = user == null ? null : user.getRole();
            boolean isAdmin = role != null && role >= 1;

            if (userId == null) {
                return Result.error(401, "Please login first");
            }
            if (!isAdmin && authService.isReadOnlyMemberUser(userId)) {
                return Result.error(403, "Identity claim is pending review");
            }

            member.setCreatorId(userId);
            member.setAuditStatus(0);
            member.setIsExternalSpouse(0);
            member.setSpouseId(null);
            member.setMotherId(null);

            Long recordId = auditService.submitMemberAudit(member);
            return Result.success(recordId);
        } catch (Exception e) {
            log.error("submit audit failed", e);
            return Result.error("Submit failed: " + e.getMessage());
        }
    }

    private Map<String, Object> buildPendingMemberItem(FamilyMember member) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", member.getId());
        item.put("reviewId", member.getId());
        item.put("targetType", "member");
        item.put("auditKind", "member");
        item.put("name", member.getName());
        item.put("displayName", member.getName());
        item.put("gender", member.getGender());
        item.put("birthDate", member.getBirthDate());
        item.put("generation", member.getGeneration());
        item.put("occupation", member.getOccupation());
        item.put("currentAddress", member.getCurrentAddress());
        item.put("noteText", member.getIntroduction());
        item.put("submittedAt", member.getCreateTime());
        item.put("submitterId", member.getCreatorId());
        return item;
    }

    private Integer parseInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (Exception ignored) {
            return null;
        }
    }
}
