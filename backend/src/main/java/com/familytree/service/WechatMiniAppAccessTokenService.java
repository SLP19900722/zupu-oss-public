package com.familytree.service;

public interface WechatMiniAppAccessTokenService {

    String getAccessToken();

    String refreshAccessToken();

    void invalidate();
}
