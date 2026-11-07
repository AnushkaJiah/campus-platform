package com.campus.platform.maintenance;

import com.campus.platform.entity.*;
import com.campus.platform.notification.NotificationService;
import com.campus.platform.repository.MaintenanceRequestRepository;
import com.campus.platform.repository.ResourceRepository;
import com.campus.platform.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/maintenance")
public class MaintenanceController {

    public record CreateRequest(Long resourceId, String title, String description, MaintenancePriority priority) {}

    public record StatusRequest(MaintenanceStatus status, String note) {}

    // Flat response: no passwords, no nested entities.
    public record MaintenanceResponse(Long id, Long resourceId, String resourceName, String resourceType,
                                      String buildingName, String reporterName, String reporterEmail,
                                      String title, String description, String priority, String status,
                                      String adminNote, LocalDateTime createdAt, LocalDateTime updatedAt) {}

    private final MaintenanceRequestRepository requestRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notifications;

    public MaintenanceController(MaintenanceRequestRepository requestRepository,
                                 ResourceRepository resourceRepository,
                                 UserRepository userRepository,
                                 NotificationService notifications) {
        this.requestRepository = requestRepository;
        this.resourceRepository = resourceRepository;
        this.userRepository = userRepository;
        this.notifications = notifications;
    }

    // CREATE - any logged-in user reports a problem. Admins are notified.
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateRequest request, Authentication auth) {
        User user = currentUser(auth);
        if (user == null) return error(HttpStatus.UNAUTHORIZED, "Please log in again.");

        if (request.resourceId() == null) return error(HttpStatus.BAD_REQUEST, "Please choose the room with the problem.");
        String title = request.title() == null ? "" : request.title().trim();
        if (title.isEmpty()) return error(HttpStatus.BAD_REQUEST, "Please give the problem a short title.");
        if (title.length() > 120) return error(HttpStatus.BAD_REQUEST, "The title is too long (120 characters max).");
        String description = request.description() == null ? null : request.description().trim();
        if (description != null && description.length() > 1000) {
            return error(HttpStatus.BAD_REQUEST, "The description is too long (1000 characters max).");
        }
        Resource resource = resourceRepository.findById(request.resourceId()).orElse(null);
        if (resource == null) return error(HttpStatus.NOT_FOUND, "That room does not exist.");

        MaintenanceRequest m = new MaintenanceRequest();
        m.setResource(resource);
        m.setReportedBy(user);
        m.setTitle(title);
        m.setDescription(description == null || description.isEmpty() ? null : description);
        m.setPriority(request.priority() == null ? MaintenancePriority.MEDIUM : request.priority());
        MaintenanceRequest saved = requestRepository.save(m);

        notifications.notifyAdmins(user.getName() + " reported a problem in " + resource.getName() + ": " + title,
                "maintenance");
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    // READ - the reports I made
    @GetMapping("/mine")
    public ResponseEntity<?> mine(Authentication auth) {
        User user = currentUser(auth);
        if (user == null) return error(HttpStatus.UNAUTHORIZED, "Please log in again.");
        return ResponseEntity.ok(requestRepository.findByReportedByIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).toList());
    }

    // READ - every report (admin only, enforced in SecurityConfig)
    @GetMapping
    public List<MaintenanceResponse> all() {
        return requestRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    // UPDATE - admin moves a report between OPEN, IN_PROGRESS and RESOLVED.
    // While work is in progress the room is marked MAINTENANCE so nobody can book it;
    // once nothing is open for that room any more it goes back to AVAILABLE.
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody StatusRequest body) {
        MaintenanceRequest m = requestRepository.findById(id).orElse(null);
        if (m == null) return error(HttpStatus.NOT_FOUND, "Report not found.");
        if (body == null || body.status() == null) return error(HttpStatus.BAD_REQUEST, "A status is required.");
        if (m.getStatus() == body.status()) return error(HttpStatus.CONFLICT, "The report already has that status.");

        m.setStatus(body.status());
        if (body.note() != null && !body.note().isBlank()) m.setAdminNote(body.note().trim());
        m.setUpdatedAt(LocalDateTime.now());
        requestRepository.save(m);

        syncRoomStatus(m.getResource());

        String what = switch (body.status()) {
            case IN_PROGRESS -> "is being worked on";
            case RESOLVED -> "has been fixed";
            case OPEN -> "was reopened";
        };
        notifications.notifyUser(m.getReportedBy(),
                "Your report \"" + m.getTitle() + "\" for " + m.getResource().getName() + " " + what + ".",
                "maintenance");
        return ResponseEntity.ok(toResponse(m));
    }

    // ---- helpers ----

    private void syncRoomStatus(Resource resource) {
        boolean underRepair = requestRepository.existsByResourceIdAndStatusIn(
                resource.getId(), EnumSet.of(MaintenanceStatus.IN_PROGRESS));
        if (underRepair && resource.getStatus() != ResourceStatus.MAINTENANCE) {
            resource.setStatus(ResourceStatus.MAINTENANCE);
            resourceRepository.save(resource);
        } else if (!underRepair && resource.getStatus() == ResourceStatus.MAINTENANCE) {
            resource.setStatus(ResourceStatus.AVAILABLE);
            resourceRepository.save(resource);
        }
    }

    private User currentUser(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
    }

    private MaintenanceResponse toResponse(MaintenanceRequest m) {
        Resource r = m.getResource();
        return new MaintenanceResponse(
                m.getId(), r.getId(), r.getName(), r.getType().name(),
                r.getBuilding() != null ? r.getBuilding().getName() : null,
                m.getReportedBy().getName(), m.getReportedBy().getEmail(),
                m.getTitle(), m.getDescription(), m.getPriority().name(), m.getStatus().name(),
                m.getAdminNote(), m.getCreatedAt(), m.getUpdatedAt());
    }

    private static ResponseEntity<?> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }

}
