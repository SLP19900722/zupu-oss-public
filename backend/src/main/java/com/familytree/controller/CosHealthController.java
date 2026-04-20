package com.familytree.controller;

import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import com.familytree.common.Result;
import com.familytree.config.CosConfig;
import com.familytree.util.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/cos")
public class CosHealthController {

    @Autowired
    private CosConfig cosConfig;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/health")
    public Result<Map<String, Object>> health() {
        try {
            Map<String, Object> data = new HashMap<String, Object>();
            data.put("bucket", cosConfig.getBucket());
            data.put("region", cosConfig.getRegion());
            data.put("cdnUrl", cosConfig.getCdnUrl());

            if (!StringUtils.hasText(cosConfig.getSecretId())
                    || !StringUtils.hasText(cosConfig.getSecretKey())
                    || !StringUtils.hasText(cosConfig.getBucket())
                    || !StringUtils.hasText(cosConfig.getRegion())) {
                data.put("ok", false);
                data.put("message", "COS configuration is incomplete. Please check familytree.cos settings.");
                return Result.success(data);
            }

            String checkUrl = cosConfig.getCdnUrl();
            if (!StringUtils.hasText(checkUrl)) {
                checkUrl = String.format("https://%s.cos.%s.myqcloud.com", cosConfig.getBucket(), cosConfig.getRegion());
            }

            try (HttpResponse response = HttpRequest.head(checkUrl)
                    .timeout(5000)
                    .execute()) {
                int status = response.getStatus();
                data.put("httpStatus", status);
                data.put("checkUrl", checkUrl);

                if (status >= 200 && status < 400) {
                    data.put("ok", true);
                    data.put("message", "COS request succeeded");
                } else if (status == 403) {
                    data.put("ok", true);
                    data.put("message", "COS is reachable but requires authorization (403)");
                } else if (status == 404) {
                    data.put("ok", false);
                    data.put("message", "COS request failed, HTTP status: 404");
                    data.put("hint", "Check whether the bucket, region, CDN domain, or AppID suffix is configured correctly.");
                } else {
                    data.put("ok", false);
                    data.put("message", "COS request failed, HTTP status: " + status);
                }
            }

            return Result.success(data);
        } catch (Exception e) {
            log.error("COS health check failed", e);
            return Result.error("COS check failed: " + e.getMessage());
        }
    }
}
