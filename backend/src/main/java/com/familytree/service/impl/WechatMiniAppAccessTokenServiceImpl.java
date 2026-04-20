package com.familytree.service.impl;

import com.familytree.service.WechatMiniAppAccessTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class WechatMiniAppAccessTokenServiceImpl implements WechatMiniAppAccessTokenService {

    @Value("${familytree.wechat.miniapp.app-id:}")
    private String appId;

    @Value("${familytree.wechat.miniapp.secret:}")
    private String appSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Object lock = new Object();

    private volatile String cachedToken;
    private volatile long expireAtMs;

    @Override
    public String getAccessToken() {
        if (isTokenValid()) {
            return cachedToken;
        }

        synchronized (lock) {
            if (isTokenValid()) {
                return cachedToken;
            }
            return refreshInternal();
        }
    }

    @Override
    public String refreshAccessToken() {
        synchronized (lock) {
            return refreshInternal();
        }
    }

    @Override
    public void invalidate() {
        synchronized (lock) {
            cachedToken = null;
            expireAtMs = 0L;
        }
    }

    private boolean isTokenValid() {
        return cachedToken != null
                && !cachedToken.trim().isEmpty()
                && System.currentTimeMillis() < expireAtMs - 60000L;
    }

    private String refreshInternal() {
        if (!hasText(appId) || !hasText(appSecret)) {
            throw new IllegalStateException("微信小程序 appId 或 secret 未配置");
        }

        try {
            String url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential"
                    + "&appid=" + appId
                    + "&secret=" + appSecret;
            RestTemplate restTemplate = new RestTemplate();
            String responseStr = restTemplate.getForObject(url, String.class);
            Map<String, Object> response = objectMapper.readValue(responseStr, Map.class);

            Integer errcode = toInteger(response.get("errcode"));
            if (errcode != null && errcode.intValue() != 0) {
                throw new IllegalStateException("获取 access_token 失败: " + asString(response.get("errmsg")));
            }

            String accessToken = asString(response.get("access_token"));
            Integer expiresIn = toInteger(response.get("expires_in"));
            if (!hasText(accessToken)) {
                throw new IllegalStateException("微信 access_token 返回为空");
            }

            cachedToken = accessToken;
            expireAtMs = System.currentTimeMillis() + (expiresIn == null ? 7200L : expiresIn.longValue()) * 1000L;
            return cachedToken;
        } catch (Exception e) {
            throw new IllegalStateException("获取微信 access_token 失败: " + e.getMessage(), e);
        }
    }

    private Integer toInteger(Object value) {
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

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
