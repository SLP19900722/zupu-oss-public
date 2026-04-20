package com.familytree.service.impl;

import com.familytree.config.CosConfig;
import com.familytree.service.UploadService;
import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectRequest;
import com.qcloud.cos.region.Region;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Locale;
import java.util.UUID;

/**
 * 文件上传服务实现
 */
@Slf4j
@Service
public class UploadServiceImpl implements UploadService {

    @Autowired
    private CosConfig cosConfig;

    private COSClient getCOSClient() {
        COSCredentials cred = new BasicCOSCredentials(
                cosConfig.getSecretId(),
                cosConfig.getSecretKey()
        );
        ClientConfig clientConfig = new ClientConfig(new Region(cosConfig.getRegion()));
        return new COSClient(cred, clientConfig);
    }

    @Override
    public String uploadAvatar(MultipartFile file, Long userId) throws Exception {
        String extension = validateImageFile(file);
        String key = String.format(
                "avatars/%d_%s%s",
                userId,
                UUID.randomUUID().toString().replace("-", ""),
                extension
        );
        return uploadToCOS(file.getInputStream(), key, file.getContentType(), file.getSize());
    }

    @Override
    public String uploadMigrationImage(MultipartFile file, Long timelineId) throws Exception {
        String extension = validateImageFile(file);
        String key = String.format(
                "migration/%d_%s%s",
                timelineId,
                UUID.randomUUID().toString().replace("-", ""),
                extension
        );
        return uploadToCOS(file.getInputStream(), key, file.getContentType(), file.getSize());
    }

    @Override
    public String uploadHomeGalleryImage(MultipartFile file, Long userId) throws Exception {
        String extension = validateImageFile(file);
        String key = String.format(
                "gallery/%d_%s%s",
                userId,
                UUID.randomUUID().toString().replace("-", ""),
                extension
        );
        return uploadToCOS(file.getInputStream(), key, file.getContentType(), file.getSize());
    }

    private String validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        if (file.getSize() > cosConfig.getMaxFileSize()) {
            throw new IllegalArgumentException("文件大小不能超过 10MB");
        }

        String originalFilename = file.getOriginalFilename();
        if (!StringUtils.hasText(originalFilename) || !originalFilename.contains(".")) {
            throw new IllegalArgumentException("文件名不合法");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase(Locale.ROOT);
        String normalizedTypes = ",jpg,jpeg,png,gif,webp,";
        String normalizedExtension = extension.replace(".", "");
        if (!normalizedTypes.contains("," + normalizedExtension + ",")) {
            throw new IllegalArgumentException("仅支持 jpg、jpeg、png、gif、webp 格式图片");
        }

        return extension;
    }

    private String uploadToCOS(InputStream inputStream, String key, String contentType, long contentLength) throws Exception {
        COSClient cosClient = null;
        try {
            cosClient = getCOSClient();

            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(contentLength);
            metadata.setContentType(contentType);

            PutObjectRequest request = new PutObjectRequest(
                    cosConfig.getBucket(),
                    key,
                    inputStream,
                    metadata
            );
            cosClient.putObject(request);

            if (StringUtils.hasText(cosConfig.getCdnUrl())) {
                return cosConfig.getCdnUrl() + "/" + key;
            }
            return String.format(
                    "https://%s.cos.%s.myqcloud.com/%s",
                    cosConfig.getBucket(),
                    cosConfig.getRegion(),
                    key
            );
        } catch (Exception e) {
            log.error("上传文件到 COS 失败", e);
            throw new Exception("上传失败: " + e.getMessage());
        } finally {
            if (cosClient != null) {
                cosClient.shutdown();
            }
        }
    }
}
