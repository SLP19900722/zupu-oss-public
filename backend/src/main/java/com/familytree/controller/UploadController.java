package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.User;
import com.familytree.service.AuthService;
import com.familytree.service.UploadService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/upload")
public class UploadController {

    @Autowired
    private UploadService uploadService;

    @Autowired
    private AuthService authService;

    @PostMapping("/avatar")
    public Result<Map<String, String>> uploadAvatar(@RequestParam("file") MultipartFile file,
                                                    @RequestHeader("Authorization") String authorization) {
        try {
            String token = extractToken(authorization);
            User currentUser = authService.getCurrentUserByToken(token);
            Long userId = currentUser == null ? null : currentUser.getId();
            Integer role = currentUser == null ? null : currentUser.getRole();
            if (userId == null) {
                return Result.error(401, "Please login first");
            }
            if ((role == null || role < 1) && authService.isReadOnlyMemberUser(userId)) {
                return Result.error(403, "Identity claim is pending review");
            }

            String url = uploadService.uploadAvatar(file, userId);
            Map<String, String> data = new HashMap<>();
            data.put("url", url);
            return Result.success(data);
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("upload avatar failed", e);
            return Result.error("Upload avatar failed");
        }
    }

    @PostMapping("/migration")
    public Result<Map<String, String>> uploadMigrationImage(@RequestParam("file") MultipartFile file,
                                                            @RequestParam("timelineId") Long timelineId,
                                                            @RequestHeader("Authorization") String authorization) {
        try {
            String token = extractToken(authorization);
            User currentUser = authService.getCurrentUserByToken(token);
            Integer role = currentUser == null ? null : currentUser.getRole();
            Long userId = currentUser == null ? null : currentUser.getId();
            if (userId == null || role == null || role < 1) {
                return Result.error(401, "Only admins can upload migration images");
            }

            String url = uploadService.uploadMigrationImage(file, timelineId);
            Map<String, String> data = new HashMap<>();
            data.put("url", url);
            return Result.success(data);
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("upload migration image failed", e);
            return Result.error("Upload migration image failed");
        }
    }

    @PostMapping("/gallery")
    public Result<Map<String, String>> uploadHomeGalleryImage(@RequestParam("file") MultipartFile file,
                                                              @RequestHeader("Authorization") String authorization) {
        try {
            String token = extractToken(authorization);
            User currentUser = authService.getCurrentUserByToken(token);
            Long userId = currentUser == null ? null : currentUser.getId();
            Integer role = currentUser == null ? null : currentUser.getRole();
            if (userId == null) {
                return Result.error(401, "Please login first");
            }
            if ((role == null || role < 1) && authService.isReadOnlyMemberUser(userId)) {
                return Result.error(403, "Identity claim is pending review");
            }

            String url = uploadService.uploadHomeGalleryImage(file, userId);
            Map<String, String> data = new HashMap<>();
            data.put("url", url);
            return Result.success(data);
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("upload gallery image failed", e);
            return Result.error("Upload gallery image failed");
        }
    }

    private String extractToken(String authorization) {
        if (!StringUtils.hasText(authorization)) {
            return "";
        }
        return authorization.replace("Bearer ", "");
    }
}
