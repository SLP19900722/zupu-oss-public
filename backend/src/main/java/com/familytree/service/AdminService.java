package com.familytree.service;

import com.familytree.entity.User;
import java.util.List;
import java.util.Map;

public interface AdminService {
    List<User> listUsers(Integer role, Integer status, String keyword);

    boolean updateUserRole(Long userId, Integer role);

    boolean updateUserStatus(Long userId, Integer status);

    Map<String, Object> getUserBindingDetail(Long userId);

    List<Map<String, Object>> listBindableMembersForUser(Long userId, String keyword);

    Map<String, Object> updateUserPreferredMember(Long userId, Long preferredMemberId, Long operatorId);
}
