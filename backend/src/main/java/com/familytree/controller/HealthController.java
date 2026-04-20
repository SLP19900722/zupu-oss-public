package com.familytree.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping
public class HealthController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("application", "family-tree-backend");
        response.put("version", "1.0.0");
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }

    @GetMapping("/api/health")
    public Map<String, Object> apiHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "family-tree-api");
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
}