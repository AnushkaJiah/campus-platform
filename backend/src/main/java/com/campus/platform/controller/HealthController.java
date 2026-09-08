package com.campus.platform.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "Smart Campus Resource Management Platform",
                "timestamp", LocalDateTime.now().toString()
        );
    }

}
