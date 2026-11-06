package com.campus.platform.controller;

import com.campus.platform.entity.Alert;
import com.campus.platform.repository.AlertRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "http://localhost:3000")
public class AlertController {

    private final AlertRepository alertRepository;

    public AlertController(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    // READ - all unresolved alerts, most recent first (main admin dashboard view)
    @GetMapping
    public List<Alert> getActiveAlerts() {
        return alertRepository.findByResolvedFalseOrderByCreatedAtDesc();
    }

    // READ - full alert history, including resolved ones (last 50)
    @GetMapping("/history")
    public List<Alert> getAlertHistory() {
        return alertRepository.findTop50ByOrderByCreatedAtDesc();
    }

    // READ - all alerts for one specific resource
    @GetMapping("/resource/{resourceId}")
    public List<Alert> getAlertsForResource(@PathVariable Long resourceId) {
        return alertRepository.findByResourceIdOrderByCreatedAtDesc(resourceId);
    }

    // UPDATE - mark an alert as resolved (e.g. admin clicks "acknowledge")
    @PutMapping("/{id}/resolve")
    public ResponseEntity<Alert> resolveAlert(@PathVariable Long id) {
        return alertRepository.findById(id)
                .map(alert -> {
                    alert.setResolved(true);
                    return ResponseEntity.ok(alertRepository.save(alert));
                })
                .orElse(ResponseEntity.notFound().build());
    }

}
