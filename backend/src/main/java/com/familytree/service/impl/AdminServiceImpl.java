package com.familytree.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.familytree.entity.FamilyMember;
import com.familytree.entity.User;
import com.familytree.mapper.FamilyMemberMapper;
import com.familytree.mapper.UserMapper;
import com.familytree.service.AdminService;
import com.familytree.service.AuthService;
import com.familytree.service.FamilyMemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private FamilyMemberMapper familyMemberMapper;

    @Autowired
    private FamilyMemberService familyMemberService;

    @Autowired
    private AuthService authService;

    @Override
    public List<User> listUsers(Integer role, Integer status, String keyword) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        if (role != null) {
            wrapper.eq("role", role);
        }
        if (status != null) {
            wrapper.eq("status", status);
        }
        if (keyword != null && !keyword.trim().isEmpty()) {
            List<Long> matchedMemberIds = loadMatchedPreferredMemberIds(keyword);
            wrapper.and(w -> {
                w.like("nick_name", keyword)
                        .or()
                        .like("real_name", keyword)
                        .or()
                        .like("phone", keyword);
                if (!matchedMemberIds.isEmpty()) {
                    w.or().in("preferred_member_id", matchedMemberIds);
                }
            });
        }
        wrapper.eq("deleted", 0);
        wrapper.orderByDesc("role");
        wrapper.orderByDesc("updated_at");
        wrapper.orderByDesc("id");
        List<User> users = userMapper.selectList(wrapper);
        populateUserBindingMeta(users);
        return users;
    }

    @Override
    public boolean updateUserRole(Long userId, Integer role) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            return false;
        }
        user.setRole(role);
        return userMapper.updateById(user) > 0;
    }

    @Override
    public boolean updateUserStatus(Long userId, Integer status) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            return false;
        }
        user.setStatus(status);
        return userMapper.updateById(user) > 0;
    }

    @Override
    public Map<String, Object> getUserBindingDetail(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || Objects.equals(user.getDeleted(), 1)) {
            throw new IllegalArgumentException("User not found");
        }
        return buildUserBindingDetail(user);
    }

    @Override
    public List<Map<String, Object>> listBindableMembersForUser(Long userId, String keyword) {
        User targetUser = userMapper.selectById(userId);
        if (targetUser == null || Objects.equals(targetUser.getDeleted(), 1)) {
            throw new IllegalArgumentException("User not found");
        }

        List<FamilyMember> members = familyMemberService.getBindableMembers(userId, true);
        String normalizedKeyword = normalizeText(keyword);
        Map<Long, List<User>> holderMap = loadPreferredMemberHolderMap();
        List<Map<String, Object>> result = new ArrayList<>();
        for (FamilyMember member : members) {
            if (member == null || member.getId() == null) {
                continue;
            }
            if (!matchesKeyword(member, normalizedKeyword)) {
                continue;
            }

            List<User> holders = holderMap.get(member.getId());
            User primaryHolder = selectPrimaryHolder(holders, userId);
            List<String> holderNames = new ArrayList<>();
            if (holders != null) {
                for (User holder : holders) {
                    String holderName = buildUserDisplayName(holder);
                    if (holderName != null && !holderName.isEmpty()) {
                        holderNames.add(holderName);
                    }
                }
            }

            Map<String, Object> item = new HashMap<>();
            item.put("id", member.getId());
            item.put("name", member.getName());
            item.put("gender", member.getGender());
            item.put("generation", member.getGeneration());
            item.put("identityType", member.getIdentityType());
            item.put("displayMemberId", member.getDisplayMemberId());
            item.put("displayMemberName", member.getDisplayMemberName());
            item.put("spouseOwnerMemberId", member.getSpouseOwnerMemberId());
            item.put("spouseOwnerMemberName", member.getSpouseOwnerMemberName());
            item.put("isExternalSpouse", member.getIsExternalSpouse());
            item.put("boundUserId", primaryHolder == null ? null : primaryHolder.getId());
            item.put("boundUserName", primaryHolder == null ? null : buildUserDisplayName(primaryHolder));
            item.put("boundByOtherUser", primaryHolder != null && !Objects.equals(primaryHolder.getId(), userId));
            item.put("boundUserCount", holders == null ? 0 : holders.size());
            item.put("boundUserNames", holderNames);
            result.add(item);
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> updateUserPreferredMember(Long userId, Long preferredMemberId, Long operatorId) {
        User targetUser = userMapper.selectById(userId);
        if (targetUser == null || Objects.equals(targetUser.getDeleted(), 1)) {
            throw new IllegalArgumentException("User not found");
        }

        Long normalizedPreferredMemberId = normalizeId(preferredMemberId);
        Long oldPreferredMemberId = normalizeId(targetUser.getPreferredMemberId());

        if (normalizedPreferredMemberId != null) {
            FamilyMember member = familyMemberService.getMemberByIdIncludingHidden(normalizedPreferredMemberId);
            if (member == null || !Objects.equals(member.getAuditStatus(), 1)) {
                throw new IllegalArgumentException("Member not found or not approved");
            }
            if (Objects.equals(member.getIsAlive(), 0)) {
                throw new IllegalArgumentException("Deceased members cannot be bound as identity");
            }
        }

        if (Objects.equals(oldPreferredMemberId, normalizedPreferredMemberId)) {
            return buildUserBindingDetail(targetUser);
        }

        if (normalizedPreferredMemberId != null) {
            List<User> existingHolders = findUsersByPreferredMemberId(normalizedPreferredMemberId, userId);
            for (User holder : existingHolders) {
                Long holderOldPreferredMemberId = normalizeId(holder.getPreferredMemberId());
                holder.setPreferredMemberId(null);
                userMapper.updateById(holder);
                authService.recordPreferredMemberBinding(holder.getId(), holderOldPreferredMemberId, null, operatorId);
            }
        }

        targetUser.setPreferredMemberId(normalizedPreferredMemberId);
        userMapper.updateById(targetUser);
        authService.recordPreferredMemberBinding(userId, oldPreferredMemberId, normalizedPreferredMemberId, operatorId);

        reconcileMemberBinding(oldPreferredMemberId);
        reconcileMemberBinding(normalizedPreferredMemberId);

        User latestTargetUser = userMapper.selectById(userId);
        return buildUserBindingDetail(latestTargetUser == null ? targetUser : latestTargetUser);
    }

    private Map<String, Object> buildUserBindingDetail(User user) {
        Map<String, Object> bindingState = authService.getIdentityBindingState(user.getId());
        Long preferredMemberId = normalizeId(user.getPreferredMemberId());
        FamilyMember preferredMember = preferredMemberId == null
                ? null
                : familyMemberService.getAnyMemberById(preferredMemberId);

        Map<String, Object> data = new HashMap<>();
        String bindingStatus = bindingState == null ? "NONE" : asString(bindingState.get("bindingStatus"));
        boolean readOnlyMode = bindingState != null && Boolean.TRUE.equals(bindingState.get("readOnlyMode"));

        data.put("userId", user.getId());
        data.put("userName", buildUserDisplayName(user));
        data.put("userRealName", user.getRealName());
        data.put("userPhone", user.getPhone());
        data.put("canChange", true);
        data.put("bindingStatus", bindingStatus == null ? "NONE" : bindingStatus);
        data.put("readOnlyMode", readOnlyMode);
        data.put("readOnlyReason", bindingState == null ? null : bindingState.get("readOnlyReason"));
        data.put("pendingMemberId", bindingState == null ? null : bindingState.get("pendingMemberId"));
        data.put("pendingMemberName", bindingState == null ? null : bindingState.get("pendingMemberName"));
        data.put("pendingDisplayMemberId", bindingState == null ? null : bindingState.get("pendingDisplayMemberId"));
        data.put("pendingDisplayMemberName", bindingState == null ? null : bindingState.get("pendingDisplayMemberName"));
        data.put("bindingRemark", bindingState == null ? null : bindingState.get("bindingRemark"));

        if (preferredMember == null) {
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

        boolean isExternalSpouse = Objects.equals(preferredMember.getIsExternalSpouse(), 1);
        boolean preferredMemberVisible = !isExternalSpouse && Objects.equals(preferredMember.getAuditStatus(), 1);
        data.put("preferredMemberId", preferredMember.getId());
        data.put("preferredMemberName", preferredMember.getName());
        data.put("identityType", isExternalSpouse ? "EXTERNAL_SPOUSE" : "MEMBER");
        data.put("preferredMemberVisible", preferredMemberVisible);
        data.put("displayMemberId", preferredMemberVisible ? preferredMember.getId() : preferredMember.getDisplayMemberId());
        data.put("displayMemberName", preferredMemberVisible ? preferredMember.getName() : preferredMember.getDisplayMemberName());
        data.put("spouseOwnerMemberId", preferredMember.getSpouseOwnerMemberId());
        data.put("spouseOwnerMemberName", preferredMember.getSpouseOwnerMemberName());
        return data;
    }

    private void populateUserBindingMeta(List<User> users) {
        if (users == null || users.isEmpty()) {
            return;
        }

        List<Long> preferredMemberIds = new ArrayList<>();
        for (User user : users) {
            Long preferredMemberId = normalizeId(user == null ? null : user.getPreferredMemberId());
            if (preferredMemberId != null && !preferredMemberIds.contains(preferredMemberId)) {
                preferredMemberIds.add(preferredMemberId);
            }
        }
        if (preferredMemberIds.isEmpty()) {
            return;
        }

        List<FamilyMember> members = familyMemberMapper.selectBatchIds(preferredMemberIds);
        if (members == null || members.isEmpty()) {
            return;
        }

        Map<Long, FamilyMember> memberMap = new HashMap<>();
        for (FamilyMember member : members) {
            if (member != null && member.getId() != null) {
                memberMap.put(member.getId(), member);
            }
        }

        for (User user : users) {
            if (user == null) {
                continue;
            }
            FamilyMember preferredMember = memberMap.get(normalizeId(user.getPreferredMemberId()));
            if (preferredMember != null) {
                applyPreferredMemberMeta(user, preferredMember);
            }
        }
    }

    private void applyPreferredMemberMeta(User user, FamilyMember preferredMember) {
        boolean isExternalSpouse = Objects.equals(preferredMember.getIsExternalSpouse(), 1);
        boolean preferredMemberVisible = !isExternalSpouse && Objects.equals(preferredMember.getAuditStatus(), 1);

        user.setPreferredMemberName(preferredMember.getName());
        user.setIdentityType(isExternalSpouse ? "EXTERNAL_SPOUSE" : "MEMBER");
        user.setPreferredMemberVisible(preferredMemberVisible);
        user.setDisplayMemberId(preferredMemberVisible ? preferredMember.getId() : preferredMember.getDisplayMemberId());
        user.setDisplayMemberName(preferredMemberVisible ? preferredMember.getName() : preferredMember.getDisplayMemberName());
        user.setSpouseOwnerMemberId(preferredMember.getSpouseOwnerMemberId());
        user.setSpouseOwnerMemberName(preferredMember.getSpouseOwnerMemberName());
    }

    private List<Long> loadMatchedPreferredMemberIds(String keyword) {
        String normalizedKeyword = normalizeText(keyword);
        if (normalizedKeyword == null) {
            return new ArrayList<>();
        }

        QueryWrapper<FamilyMember> wrapper = new QueryWrapper<>();
        wrapper.select("id")
                .eq("deleted", 0)
                .like("name", normalizedKeyword);

        List<FamilyMember> members = familyMemberMapper.selectList(wrapper);
        List<Long> memberIds = new ArrayList<>();
        for (FamilyMember member : members) {
            if (member != null && member.getId() != null) {
                memberIds.add(member.getId());
            }
        }
        return memberIds;
    }

    private boolean matchesKeyword(FamilyMember member, String keyword) {
        if (keyword == null) {
            return true;
        }
        String name = normalizeText(member.getName());
        String displayName = normalizeText(member.getDisplayMemberName());
        String ownerName = normalizeText(member.getSpouseOwnerMemberName());
        return containsText(name, keyword)
                || containsText(displayName, keyword)
                || containsText(ownerName, keyword);
    }

    private boolean containsText(String source, String keyword) {
        return source != null && keyword != null && source.contains(keyword);
    }

    private Map<Long, List<User>> loadPreferredMemberHolderMap() {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getDeleted, 0)
                .isNotNull(User::getPreferredMemberId)
                .orderByDesc(User::getUpdatedAt)
                .orderByDesc(User::getId);
        List<User> users = userMapper.selectList(wrapper);

        Map<Long, List<User>> result = new HashMap<>();
        for (User user : users) {
            Long memberId = normalizeId(user == null ? null : user.getPreferredMemberId());
            if (memberId == null) {
                continue;
            }
            result.computeIfAbsent(memberId, key -> new ArrayList<>()).add(user);
        }
        return result;
    }

    private User selectPrimaryHolder(List<User> holders, Long targetUserId) {
        if (holders == null || holders.isEmpty()) {
            return null;
        }
        for (User holder : holders) {
            if (holder != null && !Objects.equals(holder.getId(), targetUserId)) {
                return holder;
            }
        }
        return holders.get(0);
    }

    private List<User> findUsersByPreferredMemberId(Long memberId, Long excludeUserId) {
        if (memberId == null || memberId <= 0) {
            return new ArrayList<>();
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getDeleted, 0)
                .eq(User::getPreferredMemberId, memberId)
                .orderByDesc(User::getUpdatedAt)
                .orderByDesc(User::getId);
        if (excludeUserId != null && excludeUserId > 0) {
            wrapper.ne(User::getId, excludeUserId);
        }
        return userMapper.selectList(wrapper);
    }

    private void reconcileMemberBinding(Long memberId) {
        Long normalizedMemberId = normalizeId(memberId);
        if (normalizedMemberId == null) {
            return;
        }

        FamilyMember member = familyMemberMapper.selectById(normalizedMemberId);
        if (member == null || Objects.equals(member.getDeleted(), 1)) {
            return;
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getDeleted, 0)
                .eq(User::getPreferredMemberId, normalizedMemberId)
                .orderByDesc(User::getUpdatedAt)
                .orderByDesc(User::getId)
                .last("LIMIT 1");
        User holder = userMapper.selectOne(wrapper);
        Long nextUserId = holder == null ? null : holder.getId();
        if (Objects.equals(normalizeId(member.getUserId()), normalizeId(nextUserId))) {
            return;
        }

        member.setUserId(nextUserId);
        familyMemberMapper.updateById(member);
    }

    private Long normalizeId(Long value) {
        return value != null && value > 0 ? value : null;
    }

    private String buildUserDisplayName(User user) {
        if (user == null) {
            return "";
        }
        String nickName = normalizeText(user.getNickName());
        if (nickName != null) {
            return nickName;
        }
        String realName = normalizeText(user.getRealName());
        if (realName != null) {
            return realName;
        }
        return user.getId() == null ? "" : "用户 " + user.getId();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? null : normalized;
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return "null".equalsIgnoreCase(text) ? null : text;
    }
}
