package com.familytree.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT工具类
 */
@Component
public class JwtUtil {

    @Value("${familytree.jwt.secret:familytree-secret-key}")
    private String secret;

    @Value("${familytree.jwt.expiration:604800000}") // 7天
    private Long expiration;

    @Value("${familytree.jwt.refresh-expiration:1209600000}") // 14天
    private Long refreshExpiration;

    /**
     * 生成Token
     */
    public String generateToken(Long userId, String openid, Integer role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("openid", openid);
        claims.put("role", role);
        return createToken(claims, expiration);
    }

    /**
     * 生成刷新Token
     */
    public String generateRefreshToken(Long userId, String openid) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("openid", openid);
        return createToken(claims, refreshExpiration);
    }

    /**
     * 创建Token
     */
    private String createToken(Map<String, Object> claims, Long expiration) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return JWT.create()
                .withClaim("userId", (Long) claims.get("userId"))
                .withClaim("openid", (String) claims.get("openid"))
                .withClaim("role", (Integer) claims.getOrDefault("role", 0))
                .withIssuedAt(now)
                .withExpiresAt(expiryDate)
                .sign(Algorithm.HMAC256(secret));
    }

    /**
     * 验证Token
     */
    public boolean validateToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(Algorithm.HMAC256(secret)).build();
            verifier.verify(token);
            return true;
        } catch (JWTVerificationException e) {
            return false;
        }
    }

    /**
     * 从Token中获取用户ID
     */
    public Long getUserIdFromToken(String token) {
        try {
            DecodedJWT jwt = JWT.decode(token);
            return jwt.getClaim("userId").asLong();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 从Token中获取OpenID
     */
    public String getOpenIdFromToken(String token) {
        try {
            DecodedJWT jwt = JWT.decode(token);
            return jwt.getClaim("openid").asString();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 从Token中获取角色
     */
    public Integer getRoleFromToken(String token) {
        try {
            DecodedJWT jwt = JWT.decode(token);
            return jwt.getClaim("role").asInt();
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * 判断Token是否过期
     */
    public boolean isTokenExpired(String token) {
        try {
            DecodedJWT jwt = JWT.decode(token);
            return jwt.getExpiresAt().before(new Date());
        } catch (Exception e) {
            return true;
        }
    }
}
