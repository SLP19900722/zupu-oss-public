package com.familytree.controller;

import com.familytree.common.Result;
import com.familytree.entity.MigrationTimeline;
import com.familytree.entity.User;
import com.familytree.service.AuthService;
import com.familytree.service.MigrationTimelineService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/migration")
public class MigrationTimelineController {

    @Autowired
    private MigrationTimelineService migrationTimelineService;

    @Autowired
    private AuthService authService;

    @GetMapping("/timeline")
    public Result<List<MigrationTimeline>> getTimeline() {
        try {
            return Result.success(migrationTimelineService.getAllTimeline());
        } catch (Exception e) {
            log.error("get migration timeline failed", e);
            return Result.error("获取失败");
        }
    }

    @PostMapping("/add")
    public Result<MigrationTimeline> addTimeline(@RequestBody MigrationTimeline timeline,
                                                 @RequestHeader("Authorization") String authorization) {
        try {
            User currentUser = requireAdmin(authorization);
            MigrationTimeline result = migrationTimelineService.addTimeline(timeline);
            log.info("admin {} added migration timeline {}", currentUser.getId(), timeline.getTitle());
            return Result.success(result);
        } catch (Exception e) {
            log.error("add migration timeline failed", e);
            return Result.error(e.getMessage());
        }
    }

    @PutMapping("/update")
    public Result<MigrationTimeline> updateTimeline(@RequestBody MigrationTimeline timeline,
                                                    @RequestHeader("Authorization") String authorization) {
        try {
            User currentUser = requireAdmin(authorization);
            MigrationTimeline result = migrationTimelineService.updateTimeline(timeline);
            log.info("admin {} updated migration timeline {}", currentUser.getId(), timeline.getId());
            return Result.success(result);
        } catch (Exception e) {
            log.error("update migration timeline failed", e);
            return Result.error(e.getMessage());
        }
    }

    @DeleteMapping("/delete/{id}")
    public Result<Void> deleteTimeline(@PathVariable Long id,
                                       @RequestHeader("Authorization") String authorization) {
        try {
            User currentUser = requireAdmin(authorization);
            migrationTimelineService.deleteTimeline(id);
            log.info("admin {} deleted migration timeline {}", currentUser.getId(), id);
            return Result.success(null);
        } catch (Exception e) {
            log.error("delete migration timeline failed", e);
            return Result.error(e.getMessage());
        }
    }

    private User requireAdmin(String authorization) {
        String token = authorization == null ? null : authorization.replace("Bearer ", "");
        User currentUser = authService.getCurrentUserByToken(token);
        Integer role = currentUser == null ? null : currentUser.getRole();
        Long userId = currentUser == null ? null : currentUser.getId();
        if (role == null || role < 2 || userId == null) {
            throw new IllegalStateException("仅管理员可操作");
        }
        return currentUser;
    }
}
