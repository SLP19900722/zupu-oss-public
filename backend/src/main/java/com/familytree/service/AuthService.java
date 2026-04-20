package com.familytree.service;

import com.familytree.entity.User;
import java.util.List;
import java.util.Map;

public interface AuthService {
    /**
     * 微信小程序登录
     */
    Map<String, Object> wxLogin(String code, String nickName, String avatarUrl, Integer gender) throws Exception;
    
    /**
     * 管理员登录
     */
    Map<String, Object> adminLogin(String username, String password) throws Exception;
    
    /**
     * 根据ID获取用户
     */
    User getUserById(Long userId);
    
    /**
     * 根据OpenID获取用户
     */
    User getUserByOpenId(String openid);

    /**
     * 根据 access token 解析并获取当前数据库用户
     */
    User getCurrentUserByToken(String token);

    /**
     * 根据 access token 解析当前数据库角色
     */
    Integer getCurrentUserRole(String token);

    /**
     * 更新用户绑定的成员ID
     */
    boolean updatePreferredMemberId(Long userId, Long preferredMemberId);

    Map<String, Object> getIdentityBindingState(Long userId);

    boolean isReadOnlyMemberUser(Long userId);

    Long requestPreferredMemberBinding(Long userId,
                                      Long requestedMemberId,
                                      String requestedMemberName,
                                      Long requestedDisplayMemberId,
                                      String requestedDisplayMemberName);

    List<Map<String, Object>> getPendingIdentityBindingAudits();

    boolean auditIdentityBinding(Long recordId, Integer status, String remark, Long auditorId);

    void recordPreferredMemberBinding(Long userId, Long oldPreferredMemberId, Long newPreferredMemberId, Long operatorId);
}
