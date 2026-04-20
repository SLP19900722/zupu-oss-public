package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.HomeGalleryImage;
import com.familytree.entity.User;
import com.familytree.service.AuthService;
import com.familytree.service.HomeGalleryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/gallery")
public class HomeGalleryController {

    @Autowired
    private HomeGalleryService homeGalleryService;

    @Autowired
    private AuthService authService;

    @GetMapping("/home")
    public Result<List<HomeGalleryImage>> getHomeGallery() {
        try {
            return Result.success(homeGalleryService.getPublishedImages());
        } catch (Exception e) {
            log.error("get home gallery failed", e);
            return Result.error("Failed to fetch home gallery");
        }
    }

    @PostMapping("/upload")
    public Result<HomeGalleryImage> submitGallery(@RequestBody HomeGalleryImage image,
                                                  @RequestHeader(value = "Authorization", required = false) String authorization) {
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

            return Result.success(homeGalleryService.submitImage(image, userId, role));
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("submit gallery failed", e);
            return Result.error("Failed to submit gallery");
        }
    }

    @GetMapping("/pending")
    public Result<Map<String, Object>> getPendingGallery(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String token = extractToken(authorization);
            Integer role = authService.getCurrentUserRole(token);
            if (role == null || role < 1) {
                return Result.error(401, "No permission");
            }

            List<HomeGalleryImage> items = homeGalleryService.getPendingImages();
            Map<String, Object> data = new HashMap<>();
            data.put("count", items.size());
            data.put("items", items);
            return Result.success(data);
        } catch (Exception e) {
            log.error("get pending gallery failed", e);
            return Result.error("Failed to fetch pending gallery");
        }
    }

    @PostMapping("/review/{id}")
    public Result<String> reviewGallery(@PathVariable Long id,
                                        @RequestBody Map<String, Object> params,
                                        @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String token = extractToken(authorization);
            User reviewer = authService.getCurrentUserByToken(token);
            Long reviewerId = reviewer == null ? null : reviewer.getId();
            Integer role = reviewer == null ? null : reviewer.getRole();
            if (reviewerId == null || role == null || role < 1) {
                return Result.error(401, "No permission");
            }

            Integer status = (Integer) params.get("status");
            String remark = (String) params.get("remark");
            boolean success = homeGalleryService.reviewImage(id, status, remark, reviewerId);
            return success ? Result.success("Audit completed") : Result.error("Image not found");
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("review gallery failed", e);
            return Result.error("Failed to review gallery");
        }
    }

    @PostMapping("/sort/{id}")
    public Result<String> updateGallerySort(@PathVariable Long id,
                                            @RequestBody Map<String, Object> params,
                                            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String token = extractToken(authorization);
            Integer role = authService.getCurrentUserRole(token);
            if (role == null || role < 1) {
                return Result.error(401, "No permission");
            }

            Integer sortOrder = (Integer) params.get("sortOrder");
            boolean success = homeGalleryService.updateSortOrder(id, sortOrder);
            return success ? Result.success("Sort updated") : Result.error("Image not found");
        } catch (Exception e) {
            log.error("update gallery sort failed", e);
            return Result.error("Failed to update sort");
        }
    }

    @GetMapping("/mine")
    public Result<List<HomeGalleryImage>> getMyGallery(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String token = extractToken(authorization);
            User currentUser = authService.getCurrentUserByToken(token);
            Long userId = currentUser == null ? null : currentUser.getId();
            if (userId == null) {
                return Result.error(401, "Please login first");
            }
            return Result.success(homeGalleryService.getImagesByUploader(userId));
        } catch (Exception e) {
            log.error("get my gallery failed", e);
            return Result.error("Failed to fetch my gallery");
        }
    }

    @DeleteMapping("/{id}")
    public Result<String> deleteGallery(@PathVariable Long id,
                                        @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String token = extractToken(authorization);
            User currentUser = authService.getCurrentUserByToken(token);
            Long userId = currentUser == null ? null : currentUser.getId();
            Integer role = currentUser == null ? null : currentUser.getRole();
            if (userId == null) {
                return Result.error(401, "Please login first");
            }

            boolean success = homeGalleryService.deleteImage(id, userId, role);
            return success ? Result.success("Deleted") : Result.error("Image not found");
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("delete gallery failed", e);
            return Result.error("Failed to delete gallery");
        }
    }

    private String extractToken(String authorization) {
        if (!StringUtils.hasText(authorization)) {
            return "";
        }
        return authorization.replace("Bearer ", "");
    }
}
