package com.campus.platform.notification;

import com.campus.platform.entity.Notification;
import com.campus.platform.entity.User;
import com.campus.platform.repository.NotificationRepository;
import com.campus.platform.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    public record NotificationResponse(Long id, String message, String target, boolean seen, LocalDateTime createdAt) {}

    public record Summary(long unread, List<NotificationResponse> items) {}

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    // My latest notifications plus how many are unread (the number on the bell).
    @GetMapping
    public ResponseEntity<?> mine(Authentication auth) {
        User user = currentUser(auth);
        if (user == null) return error(HttpStatus.UNAUTHORIZED, "Please log in again.");
        List<NotificationResponse> items = notificationRepository
                .findTop30ByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(NotificationController::toResponse).toList();
        return ResponseEntity.ok(new Summary(notificationRepository.countByUserIdAndSeenFalse(user.getId()), items));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id, Authentication auth) {
        User user = currentUser(auth);
        if (user == null) return error(HttpStatus.UNAUTHORIZED, "Please log in again.");
        Notification n = notificationRepository.findById(id).orElse(null);
        if (n == null || !n.getUser().getId().equals(user.getId())) {
            return error(HttpStatus.NOT_FOUND, "Notification not found.");
        }
        n.setSeen(true);
        notificationRepository.save(n);
        return ResponseEntity.ok(toResponse(n));
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        User user = currentUser(auth);
        if (user == null) return error(HttpStatus.UNAUTHORIZED, "Please log in again.");
        List<Notification> unread = notificationRepository.findByUserIdAndSeenFalse(user.getId());
        unread.forEach(n -> n.setSeen(true));
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(Map.of("marked", unread.size()));
    }

    private User currentUser(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
    }

    private static NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getId(), n.getMessage(), n.getTarget(), n.isSeen(), n.getCreatedAt());
    }

    private static ResponseEntity<?> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }

}
