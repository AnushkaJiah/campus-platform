package com.campus.platform.controller;

import com.campus.platform.entity.Resource;
import com.campus.platform.entity.SensorReading;
import com.campus.platform.repository.ResourceRepository;
import com.campus.platform.repository.SensorReadingRepository;
import com.campus.platform.service.AlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sensor-readings")
@CrossOrigin(origins = "http://localhost:3000")
public class SensorReadingController {

    private final SensorReadingRepository sensorReadingRepository;
    private final ResourceRepository resourceRepository;
    private final AlertService alertService;

    public SensorReadingController(SensorReadingRepository sensorReadingRepository,
                                    ResourceRepository resourceRepository,
                                    AlertService alertService) {
        this.sensorReadingRepository = sensorReadingRepository;
        this.resourceRepository = resourceRepository;
        this.alertService = alertService;
    }

    // CREATE - this is the endpoint the IoT simulator posts to.
    // Every saved reading is immediately checked against the smart alert rules.
    @PostMapping
    public ResponseEntity<SensorReading> createReading(@RequestBody SensorReading reading) {
        if (reading.getResource() == null || reading.getResource().getId() == null) {
            return ResponseEntity.badRequest().build();
        }
        Resource resource = resourceRepository.findById(reading.getResource().getId()).orElse(null);
        if (resource == null) {
            return ResponseEntity.badRequest().build();
        }
        reading.setResource(resource);
        SensorReading saved = sensorReadingRepository.save(reading);

        alertService.evaluateReading(saved);

        return ResponseEntity.ok(saved);
    }

    // READ - most recent 50 readings across all resources (good for a live feed)
    @GetMapping
    public List<SensorReading> getRecentReadings() {
        return sensorReadingRepository.findTop50ByOrderByTimestampDesc();
    }

    // READ - full history for one resource
    @GetMapping("/resource/{resourceId}")
    public List<SensorReading> getReadingsForResource(@PathVariable Long resourceId) {
        return sensorReadingRepository.findByResourceIdOrderByTimestampDesc(resourceId);
    }

    // READ - latest single reading for one resource (what the dashboard will poll most)
    @GetMapping("/resource/{resourceId}/latest")
    public ResponseEntity<SensorReading> getLatestReadingForResource(@PathVariable Long resourceId) {
        return sensorReadingRepository.findTopByResourceIdOrderByTimestampDesc(resourceId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

}
