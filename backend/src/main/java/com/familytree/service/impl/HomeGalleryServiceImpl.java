package com.familytree.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.familytree.entity.HomeGalleryImage;
import com.familytree.mapper.HomeGalleryImageMapper;
import com.familytree.service.HomeGalleryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class HomeGalleryServiceImpl implements HomeGalleryService {

    @Autowired
    private HomeGalleryImageMapper homeGalleryImageMapper;

    @Value("${familytree.business.max-photos-per-user:100}")
    private Integer maxPhotosPerUser;

    @Override
    public List<HomeGalleryImage> getPublishedImages() {
        LambdaQueryWrapper<HomeGalleryImage> wrapper = new LambdaQueryWrapper<HomeGalleryImage>();
        wrapper.eq(HomeGalleryImage::getStatus, 1)
                .orderByAsc(HomeGalleryImage::getSortOrder)
                .orderByDesc(HomeGalleryImage::getCreatedAt);
        return homeGalleryImageMapper.selectList(wrapper);
    }

    @Override
    public List<HomeGalleryImage> getPendingImages() {
        LambdaQueryWrapper<HomeGalleryImage> wrapper = new LambdaQueryWrapper<HomeGalleryImage>();
        wrapper.eq(HomeGalleryImage::getStatus, 0)
                .orderByAsc(HomeGalleryImage::getSortOrder)
                .orderByDesc(HomeGalleryImage::getCreatedAt);
        return homeGalleryImageMapper.selectList(wrapper);
    }

    @Override
    public List<HomeGalleryImage> getImagesByUploader(Long uploaderId) {
        LambdaQueryWrapper<HomeGalleryImage> wrapper = new LambdaQueryWrapper<HomeGalleryImage>();
        wrapper.eq(HomeGalleryImage::getUploaderId, uploaderId)
                .orderByDesc(HomeGalleryImage::getCreatedAt);
        return homeGalleryImageMapper.selectList(wrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public HomeGalleryImage submitImage(HomeGalleryImage image, Long uploaderId, Integer uploaderRole) {
        if (image == null || !StringUtils.hasText(image.getImageUrl())) {
            throw new IllegalArgumentException("请先上传图片");
        }

        LambdaQueryWrapper<HomeGalleryImage> countWrapper = new LambdaQueryWrapper<HomeGalleryImage>();
        countWrapper.eq(HomeGalleryImage::getUploaderId, uploaderId);
        Long total = homeGalleryImageMapper.selectCount(countWrapper);
        if (total != null && total >= maxPhotosPerUser) {
            throw new IllegalArgumentException("上传数量已达上限");
        }

        LocalDateTime now = LocalDateTime.now();
        HomeGalleryImage record = new HomeGalleryImage();
        record.setImageUrl(image.getImageUrl());
        record.setThumbUrl(StringUtils.hasText(image.getThumbUrl()) ? image.getThumbUrl() : image.getImageUrl());
        record.setTitle(image.getTitle());
        record.setDescription(image.getDescription());
        record.setUploaderId(uploaderId);
        record.setUploaderRole(uploaderRole == null ? 0 : uploaderRole);
        record.setSortOrder(image.getSortOrder() == null ? 0 : image.getSortOrder());

        if (uploaderRole != null && uploaderRole >= 1) {
            record.setStatus(1);
            record.setReviewerId(uploaderId);
            record.setReviewedAt(now);
            record.setReviewRemark("管理员直发");
        } else {
            record.setStatus(0);
        }

        homeGalleryImageMapper.insert(record);
        return record;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean reviewImage(Long id, Integer status, String remark, Long reviewerId) {
        if (status == null || (status != 1 && status != 2)) {
            throw new IllegalArgumentException("审核状态不合法");
        }

        HomeGalleryImage image = homeGalleryImageMapper.selectById(id);
        if (image == null || image.getDeleted() != null && image.getDeleted() == 1) {
            return false;
        }
        if (image.getStatus() == null || image.getStatus() != 0) {
            throw new IllegalArgumentException("仅待审核图片可执行审核");
        }

        image.setStatus(status);
        image.setReviewerId(reviewerId);
        image.setReviewedAt(LocalDateTime.now());
        image.setReviewRemark(remark);
        return homeGalleryImageMapper.updateById(image) > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateSortOrder(Long id, Integer sortOrder) {
        HomeGalleryImage image = homeGalleryImageMapper.selectById(id);
        if (image == null) {
            return false;
        }

        image.setSortOrder(sortOrder == null ? 0 : sortOrder);
        return homeGalleryImageMapper.updateById(image) > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteImage(Long id, Long userId, Integer role) {
        HomeGalleryImage image = homeGalleryImageMapper.selectById(id);
        if (image == null) {
            return false;
        }

        boolean isAdmin = role != null && role >= 1;
        boolean isOwnerPending = userId != null
                && userId.equals(image.getUploaderId())
                && image.getStatus() != null
                && image.getStatus() != 1;

        if (!isAdmin && !isOwnerPending) {
            throw new IllegalArgumentException("无权限删除该图片");
        }

        return homeGalleryImageMapper.deleteById(id) > 0;
    }
}
