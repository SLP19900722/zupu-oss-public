package com.familytree.service;

import com.familytree.entity.HomeGalleryImage;

import java.util.List;

public interface HomeGalleryService {

    List<HomeGalleryImage> getPublishedImages();

    List<HomeGalleryImage> getPendingImages();

    List<HomeGalleryImage> getImagesByUploader(Long uploaderId);

    HomeGalleryImage submitImage(HomeGalleryImage image, Long uploaderId, Integer uploaderRole);

    boolean reviewImage(Long id, Integer status, String remark, Long reviewerId);

    boolean updateSortOrder(Long id, Integer sortOrder);

    boolean deleteImage(Long id, Long userId, Integer role);
}
