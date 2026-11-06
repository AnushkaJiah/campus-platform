package com.campus.platform.booking;

import com.campus.platform.entity.*;
import com.campus.platform.repository.BookingRepository;
import com.campus.platform.repository.ResourceRepository;
import com.campus.platform.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private static final Duration MAX_LENGTH = Duration.ofHours(8);
    private static final long MAX_DAYS_AHEAD = 90;

    public record CreateRequest(Long resourceId, LocalDateTime startTime, LocalDateTime endTime, String purpose) {}

    public record DecisionRequest(String note) {}

    // What a booking looks like to the outside world: flat, with no passwords or nested entities.
    public record BookingResponse(Long id, Long resourceId, String resourceName, String resourceType,
                                  String buildingName, String userName, String userEmail,
                                  LocalDateTime startTime, LocalDateTime endTime, String purpose,
                                  String status, String decisionNote, LocalDateTime createdAt) {}

    // Public availability: only the times, never who booked.
    public record Slot(LocalDateTime startTime, LocalDateTime endTime) {}

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;

    public BookingController(BookingRepository bookingRepository, ResourceRepository resourceRepository,
                             UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.resourceRepository = resourceRepository;
        this.userRepository = userRepository;
    }

    // CREATE - any logged-in user. Students start as PENDING; an admin's own booking is approved straight away.
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateRequest request, Authentication auth) {
        User user = currentUser(auth);
        if (user == null) return error(HttpStatus.UNAUTHORIZED, "Please log in again.");

        if (request.resourceId() == null || request.startTime() == null || request.endTime() == null) {
            return error(HttpStatus.BAD_REQUEST, "Room, start time and end time are required.");
        }
        Resource resource = resourceRepository.findById(request.resourceId()).orElse(null);
        if (resource == null) return error(HttpStatus.NOT_FOUND, "That room does not exist.");
        if (resource.getStatus() == ResourceStatus.MAINTENANCE) {
            return error(HttpStatus.CONFLICT, "This room is under maintenance and cannot be booked.");
        }

        LocalDateTime start = request.startTime();
        LocalDateTime end = request.endTime();
        LocalDateTime now = LocalDateTime.now();
        if (!end.isAfter(start)) return error(HttpStatus.BAD_REQUEST, "The end time must be after the start time.");
        if (start.isBefore(now.minusMinutes(1))) return error(HttpStatus.BAD_REQUEST, "The start time is in the past.");
        if (Duration.between(start, end).compareTo(MAX_LENGTH) > 0) {
            return error(HttpStatus.BAD_REQUEST, "A booking can be at most 8 hours long.");
        }
        if (start.isAfter(now.plusDays(MAX_DAYS_AHEAD))) {
            return error(HttpStatus.BAD_REQUEST, "Bookings can only be made up to 90 days ahead.");
        }
        if (hasClash(resource.getId(), start, end, null)) {
            return error(HttpStatus.CONFLICT, "That room is already booked for part of this time. Pick another slot.");
        }

        Booking booking = new Booking();
        booking.setResource(resource);
        booking.setUser(user);
        booking.setStartTime(start);
        booking.setEndTime(end);
        booking.setPurpose(request.purpose() == null ? null : request.purpose().trim());
        booking.setStatus(user.getRole() == Role.ADMIN ? BookingStatus.APPROVED : BookingStatus.PENDING);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(bookingRepository.save(booking)));
    }

    // READ - my own bookings
    @GetMapping("/mine")
    public ResponseEntity<?> mine(Authentication auth) {
        User user = currentUser(auth);
        if (user == null) return error(HttpStatus.UNAUTHORIZED, "Please log in again.");
        return ResponseEntity.ok(bookingRepository.findByUserIdOrderByStartTimeDesc(user.getId())
                .stream().map(this::toResponse).toList());
    }

    // READ - every booking, optionally filtered by status (admin only, enforced in SecurityConfig)
    @GetMapping
    public List<BookingResponse> all(@RequestParam(required = false) BookingStatus status) {
        List<Booking> bookings = status == null
                ? bookingRepository.findAllByOrderByCreatedAtDesc()
                : bookingRepository.findByStatusOrderByCreatedAtDesc(status);
        return bookings.stream().map(this::toResponse).toList();
    }

    // READ - when is this room already taken? (any logged-in user)
    @GetMapping("/resource/{resourceId}")
    public List<Slot> slots(@PathVariable Long resourceId) {
        return bookingRepository
                .findByResourceIdAndStatusAndEndTimeGreaterThanOrderByStartTimeAsc(
                        resourceId, BookingStatus.APPROVED, LocalDateTime.now())
                .stream().map(b -> new Slot(b.getStartTime(), b.getEndTime())).toList();
    }

    // UPDATE - admin approves a pending request
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id, @RequestBody(required = false) DecisionRequest body) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return error(HttpStatus.NOT_FOUND, "Booking not found.");
        if (booking.getStatus() != BookingStatus.PENDING) {
            return error(HttpStatus.CONFLICT, "Only pending requests can be approved.");
        }
        if (booking.getEndTime().isBefore(LocalDateTime.now())) {
            return error(HttpStatus.CONFLICT, "This request is for a time that has already passed.");
        }
        if (hasClash(booking.getResource().getId(), booking.getStartTime(), booking.getEndTime(), booking.getId())) {
            return error(HttpStatus.CONFLICT, "Another approved booking already covers part of this time.");
        }
        booking.setStatus(BookingStatus.APPROVED);
        booking.setDecisionNote(note(body));
        return ResponseEntity.ok(toResponse(bookingRepository.save(booking)));
    }

    // UPDATE - admin rejects a pending request
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, @RequestBody(required = false) DecisionRequest body) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return error(HttpStatus.NOT_FOUND, "Booking not found.");
        if (booking.getStatus() != BookingStatus.PENDING) {
            return error(HttpStatus.CONFLICT, "Only pending requests can be rejected.");
        }
        booking.setStatus(BookingStatus.REJECTED);
        booking.setDecisionNote(note(body));
        return ResponseEntity.ok(toResponse(bookingRepository.save(booking)));
    }

    // UPDATE - the person who made the booking (or an admin) cancels it
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, Authentication auth) {
        User user = currentUser(auth);
        if (user == null) return error(HttpStatus.UNAUTHORIZED, "Please log in again.");
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) return error(HttpStatus.NOT_FOUND, "Booking not found.");

        boolean isOwner = booking.getUser().getId().equals(user.getId());
        if (!isOwner && user.getRole() != Role.ADMIN) {
            return error(HttpStatus.FORBIDDEN, "You can only cancel your own bookings.");
        }
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.APPROVED) {
            return error(HttpStatus.CONFLICT, "This booking can no longer be cancelled.");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        return ResponseEntity.ok(toResponse(bookingRepository.save(booking)));
    }

    // ---- helpers ----

    private boolean hasClash(Long resourceId, LocalDateTime start, LocalDateTime end, Long ignoreBookingId) {
        return bookingRepository
                .findByResourceIdAndStatusAndStartTimeLessThanAndEndTimeGreaterThan(
                        resourceId, BookingStatus.APPROVED, end, start)
                .stream()
                .anyMatch(b -> !b.getId().equals(ignoreBookingId));
    }

    private User currentUser(Authentication auth) {
        if (auth == null) return null;
        // The token's subject is the user's email (see JwtService).
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
    }

    private static String note(DecisionRequest body) {
        if (body == null || body.note() == null || body.note().isBlank()) return null;
        return body.note().trim();
    }

    private BookingResponse toResponse(Booking b) {
        Resource r = b.getResource();
        return new BookingResponse(
                b.getId(), r.getId(), r.getName(), r.getType().name(),
                r.getBuilding() != null ? r.getBuilding().getName() : null,
                b.getUser().getName(), b.getUser().getEmail(),
                b.getStartTime(), b.getEndTime(), b.getPurpose(),
                b.getStatus().name(), b.getDecisionNote(), b.getCreatedAt());
    }

    private static ResponseEntity<?> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }

}
