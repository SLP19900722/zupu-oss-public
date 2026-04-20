package com.familytree.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 腾讯云配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "familytree.cos")
public class TencentCloudConfig {

    /**
     * 腾讯云SecretId
     */
    private String secretId;

    /**
     * 腾讯云SecretKey
     */
    private String secretKey;

    /**
     * 地域
     */
    private String region = "ap-beijing";

    /**
     * 存储桶名称
     */
    private String bucket;

    /**
     * CDN加速域名
     */
    private String cdnUrl;

    /**
     * 最大文件大小
     */
    private Long maxFileSize;

    /**
     * 允许的文件类型
     */
    private String allowedTypes;
}