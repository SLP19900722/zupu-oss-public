package com.familytree.service;

import org.springframework.web.multipart.MultipartFile;

/**
 * 文件上传服务接口
 */
public interface UploadService {

    /**
     * 上传头像到 COS
     */
    String uploadAvatar(MultipartFile file, Long userId) throws Exception;

    /**
     * 上传迁徙配图
     */
    String uploadMigrationImage(MultipartFile file, Long timelineId) throws Exception;

    /**
     * 上传首页影像图片
     */
    String uploadHomeGalleryImage(MultipartFile file, Long userId) throws Exception;
}
