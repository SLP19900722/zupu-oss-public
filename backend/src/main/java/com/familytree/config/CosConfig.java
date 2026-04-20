package com.familytree.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * COS配置属性（占位，避免依赖下载失败）
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "familytree.cos")
public class CosConfig {

    private String secretId;
    private String secretKey;
    private String region;
    private String bucket;
    private String cdnUrl;
    private Long maxFileSize;
    private String allowedTypes;
}