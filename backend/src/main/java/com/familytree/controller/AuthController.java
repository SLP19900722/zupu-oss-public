package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.FamilyMember;
import com.familytree.entity.User;
import com.familytree.service.AuthService;
import com.familytree.service.FamilyMemberService;
import com.familytree.util.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private FamilyMemberService familyMemberService;

    @PostMapping("/wx/login")
    public Result<Map<String, Object>> wxLogin(@RequestBody Map<String, String> params) {
        String code = params.get("code");
        String nickName = params.get("nickName");
        String avatarUrl = params.get("avatarUrl");
        Integer gender = Integer.parseInt(params.getOrDefault("gender", "0"));

        try {
            return Result.success(authService.wxLogin(code, nickName, avatarUrl, gender));
        } catch (Exception e) {
            log.error("wx login failed", e);
            return Result.error("Login failed: " + e.getMessage());
        }
    }

    @PostMapping("/admin/login")
    public Result<Map<String, Object>> adminLogin(@RequestBody Map<String, String> params) {
        try {
            return Result.success(authService.adminLogin(params.get("username"), params.get("password")));
        } catch (Exception e) {
            log.error("admin login failed", e);
            return Result.error("Login failed: " + e.getMessage());
        }
    }

    @PostMapping("/refresh")
    public Result<Map<String, String>> refreshToken(@RequestHeader("Authorization") String authorization) {
        try {
            String token = authorization.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token)) {
                return Result.error("Token invalid");
            }

            User user = authService.getCurrentUserByToken(token);
            if (user == null) {
                return Result.error(401, "Token invalid or expired");
            }
            Integer role = user.getRole() == null ? 0 : user.getRole();

            Map<String, String> data = new HashMap<>();
            data.put("token", jwtUtil.generateToken(user.getId(), user.getOpenid(), role));
            return Result.success(data);
        } catch (Exception e) {
            log.error("refresh token failed", e);
            return Result.error("Refresh failed");
        }
    }

    @GetMapping("/current")
    public Result<User> getCurrentUser(@RequestHeader("Authorization") String authorization) {
        try {
            User user = authService.getCurrentUserByToken(authorization.replace("Bearer ", ""));
            if (user == null) {
                return Result.error(401, "Token invalid or expired");
            }
            return user == null ? Result.error("User not found") : Result.success(user);
        } catch (Exception e) {
            log.error("get current user failed", e);
            return Result.error("Fetch failed");
        }
    }

    @GetMapping("/preferred-member")
    public Result<Map<String, Object>> getPreferredMember(@RequestHeader("Authorization") String authorization) {
        try {
            String token = authorization.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token) || jwtUtil.isTokenExpired(token)) {
                return Result.error(401, "Token invalid or expired");
            }

            User user = authService.getCurrentUserByToken(token);
            Long userId = user == null ? null : user.getId();
            Integer role = user == null ? null : user.getRole();
            boolean isAdmin = role != null && role >= 1;
            if (user == null) {
                return Result.error("User not found");
            }

            Map<String, Object> bindingState = authService.getIdentityBindingState(userId);
            boolean pending = Objects.equals(bindingState.get("bindingStatus"), "PENDING");
            boolean canChange = isAdmin || (!pending && user.getPreferredMemberId() == null);

            FamilyMember preferredMember = user.getPreferredMemberId() == null
                    ? null
                    : familyMemberService.getAnyMemberById(user.getPreferredMemberId());
            return Result.success(buildPreferredMemberMeta(preferredMember, canChange, bindingState));
        } catch (Exception e) {
            log.error("get preferred member failed", e);
            return Result.error("Fetch failed");
        }
    }

    @GetMapping("/bindable-members")
    public Result<List<FamilyMember>> getBindableMembers(@RequestHeader("Authorization") String authorization) {
        try {
            String token = authorization.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token) || jwtUtil.isTokenExpired(token)) {
                return Result.error(401, "Token invalid or expired");
            }

            User currentUser = authService.getCurrentUserByToken(token);
            if (currentUser == null) {
                return Result.error(401, "Token invalid or expired");
            }
            Long userId = currentUser == null ? null : currentUser.getId();
            Integer role = currentUser == null ? null : currentUser.getRole();
            boolean isAdmin = role != null && role >= 1;
            return Result.success(familyMemberService.getBindableMembers(userId, isAdmin));
        } catch (Exception e) {
            log.error("get bindable members failed", e);
            return Result.error("Failed to fetch bindable members");
        }
    }

    @PostMapping("/preferred-member/request")
    public Result<Map<String, Object>> requestPreferredMember(
            @RequestHeader("Authorization") String authorization,
            @RequestBody Map<String, Object> body) {
        try {
            String token = authorization.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token) || jwtUtil.isTokenExpired(token)) {
                return Result.error(401, "Token invalid or expired");
            }

            Long memberId = parseLong(body == null ? null : body.get("memberId"));
            if (memberId == null || memberId <= 0) {
                return Result.error("memberId is required");
            }

            User currentUser = authService.getCurrentUserByToken(token);
            Long userId = currentUser == null ? null : currentUser.getId();
            Integer role = currentUser == null ? null : currentUser.getRole();
            boolean isAdmin = role != null && role >= 1;
            if (isAdmin) {
                return Result.error(403, "Admins can bind directly");
            }

            User user = currentUser;
            if (user == null) {
                return Result.error("User not found");
            }
            if (user.getPreferredMemberId() != null) {
                return Result.error(403, "Current account is already bound");
            }

            FamilyMember member = familyMemberService.getMemberById(memberId);
            if (member == null || !Objects.equals(member.getAuditStatus(), 1)) {
                return Result.error("Member not found or not approved");
            }
            if (Objects.equals(member.getIsAlive(), 0)) {
                return Result.error("Deceased members cannot be claimed");
            }
            if (Objects.equals(member.getIsExternalSpouse(), 1) || !Objects.equals(member.getGender(), 1)) {
                return Result.error("Only pre-recorded male members need claim approval");
            }
            if (member.getUserId() != null && !Objects.equals(member.getUserId(), userId)) {
                return Result.error("This member has already been claimed by another account");
            }

            authService.requestPreferredMemberBinding(userId, member.getId(), member.getName(), member.getId(), member.getName());
            Map<String, Object> bindingState = authService.getIdentityBindingState(userId);
            return Result.success(buildPreferredMemberMeta(null, false, bindingState));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("request preferred member failed", e);
            return Result.error("Failed to submit identity claim");
        }
    }

    @PutMapping("/preferred-member")
    public Result<Map<String, Object>> updatePreferredMember(
            @RequestHeader("Authorization") String authorization,
            @RequestBody Map<String, Long> body) {
        try {
            String token = authorization.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token) || jwtUtil.isTokenExpired(token)) {
                return Result.error(401, "Token invalid or expired");
            }

            Long memberId = body.get("memberId");
            if (memberId == null || memberId <= 0) {
                return Result.error("memberId is required");
            }

            User user = authService.getCurrentUserByToken(token);
            Long userId = user == null ? null : user.getId();
            Integer role = user == null ? null : user.getRole();
            boolean isAdmin = role != null && role >= 1;
            if (user == null) {
                return Result.error("User not found");
            }
            if (!isAdmin && authService.isReadOnlyMemberUser(userId)) {
                return Result.error(403, "Identity claim is pending review");
            }

            Long oldPreferredMemberId = user.getPreferredMemberId();
            if (!isAdmin && oldPreferredMemberId != null && !oldPreferredMemberId.equals(memberId)) {
                return Result.error(403, "Current account is already bound and cannot be changed");
            }

            FamilyMember member = familyMemberService.getMemberByIdIncludingHidden(memberId);
            if (member == null || !Objects.equals(member.getAuditStatus(), 1)) {
                return Result.error("Member not found or not approved");
            }
            if (Objects.equals(member.getIsAlive(), 0)) {
                return Result.error("Deceased members cannot be bound as identity");
            }

            boolean isExternalSpouse = Objects.equals(member.getIsExternalSpouse(), 1);
            if (!isAdmin && !isExternalSpouse && Objects.equals(member.getGender(), 1)) {
                return Result.error(403, "Please submit a claim request for male members");
            }

            boolean updated = authService.updatePreferredMemberId(userId, memberId);
            if (!updated) {
                return Result.error("Failed to bind identity");
            }

            authService.recordPreferredMemberBinding(userId, oldPreferredMemberId, memberId, userId);
            Map<String, Object> bindingState = authService.getIdentityBindingState(userId);
            return Result.success(buildPreferredMemberMeta(member, isAdmin, bindingState));
        } catch (Exception e) {
            log.error("update preferred member failed", e);
            return Result.error("Update failed");
        }
    }

    @PostMapping("/preferred-member/external-spouse")
    public Result<Map<String, Object>> bindExternalSpousePreferredMember(
            @RequestHeader("Authorization") String authorization,
            @RequestBody Map<String, Object> body) {
        try {
            String token = authorization.replace("Bearer ", "");
            if (!jwtUtil.validateToken(token) || jwtUtil.isTokenExpired(token)) {
                return Result.error(401, "Token invalid or expired");
            }

            Long ownerMemberId = parseLong(body == null ? null : body.get("ownerMemberId"));
            String spouseName = normalizeText(body == null ? null : asString(body.get("spouseName")));
            if (ownerMemberId == null || ownerMemberId <= 0) {
                return Result.error("Please select the husband member to attach to");
            }
            if (spouseName == null) {
                return Result.error("Please enter your name");
            }

            User user = authService.getCurrentUserByToken(token);
            Long userId = user == null ? null : user.getId();
            Integer role = user == null ? null : user.getRole();
            boolean isAdmin = role != null && role >= 1;
            if (user == null) {
                return Result.error("User not found");
            }
            if (!isAdmin && authService.isReadOnlyMemberUser(userId)) {
                return Result.error(403, "Identity claim is pending review");
            }

            Long oldPreferredMemberId = user.getPreferredMemberId();
            if (!isAdmin && oldPreferredMemberId != null) {
                return Result.error(403, "Current account is already bound and cannot be changed");
            }

            FamilyMember member = familyMemberService.bindExternalSpouseIdentity(userId, ownerMemberId, spouseName);
            boolean updated = authService.updatePreferredMemberId(userId, member.getId());
            if (!updated) {
                return Result.error("Failed to bind identity");
            }

            authService.recordPreferredMemberBinding(userId, oldPreferredMemberId, member.getId(), userId);
            Map<String, Object> bindingState = authService.getIdentityBindingState(userId);
            return Result.success(buildPreferredMemberMeta(member, isAdmin, bindingState));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("bind external spouse preferred member failed", e);
            return Result.error("Failed to bind identity");
        }
    }

    private Map<String, Object> buildPreferredMemberMeta(FamilyMember member,
                                                         boolean canChange,
                                                         Map<String, Object> bindingState) {
        Map<String, Object> data = new HashMap<>();
        String bindingStatus = bindingState == null ? "NONE" : asString(bindingState.get("bindingStatus"));
        boolean readOnlyMode = bindingState != null && Boolean.TRUE.equals(bindingState.get("readOnlyMode"));

        data.put("canChange", canChange);
        data.put("bindingStatus", bindingStatus == null ? "NONE" : bindingStatus);
        data.put("readOnlyMode", readOnlyMode);
        data.put("readOnlyReason", bindingState == null ? null : bindingState.get("readOnlyReason"));
        data.put("pendingMemberId", bindingState == null ? null : bindingState.get("pendingMemberId"));
        data.put("pendingMemberName", bindingState == null ? null : bindingState.get("pendingMemberName"));
        data.put("pendingDisplayMemberId", bindingState == null ? null : bindingState.get("pendingDisplayMemberId"));
        data.put("pendingDisplayMemberName", bindingState == null ? null : bindingState.get("pendingDisplayMemberName"));
        data.put("bindingRemark", bindingState == null ? null : bindingState.get("bindingRemark"));

        if (member == null) {
            data.put("preferredMemberId", null);
            data.put("preferredMemberName", bindingState == null ? null : bindingState.get("pendingMemberName"));
            data.put("identityType", Objects.equals(bindingStatus, "PENDING") ? "PENDING_MEMBER" : null);
            data.put("preferredMemberVisible", false);
            data.put("displayMemberId", Objects.equals(bindingStatus, "PENDING") ? bindingState.get("pendingDisplayMemberId") : null);
            data.put("displayMemberName", Objects.equals(bindingStatus, "PENDING") ? bindingState.get("pendingDisplayMemberName") : null);
            data.put("spouseOwnerMemberId", null);
            data.put("spouseOwnerMemberName", null);
            return data;
        }

        boolean isExternalSpouse = Objects.equals(member.getIsExternalSpouse(), 1);
        boolean preferredMemberVisible = !isExternalSpouse && Objects.equals(member.getAuditStatus(), 1);
        data.put("preferredMemberId", member.getId());
        data.put("preferredMemberName", member.getName());
        data.put("identityType", isExternalSpouse ? "EXTERNAL_SPOUSE" : "MEMBER");
        data.put("preferredMemberVisible", preferredMemberVisible);
        data.put("displayMemberId", preferredMemberVisible ? member.getId() : member.getDisplayMemberId());
        data.put("displayMemberName", preferredMemberVisible ? member.getName() : member.getDisplayMemberName());
        data.put("spouseOwnerMemberId", member.getSpouseOwnerMemberId());
        data.put("spouseOwnerMemberName", member.getSpouseOwnerMemberName());
        return data;
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            String text = String.valueOf(value).trim();
            return text.isEmpty() ? null : Long.parseLong(text);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return "null".equalsIgnoreCase(text) ? null : text;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }
}
