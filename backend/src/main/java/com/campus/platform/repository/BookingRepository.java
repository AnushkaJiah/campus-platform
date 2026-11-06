package com.campus.platform.repository;

import com.campus.platform.entity.Booking;
import com.campus.platform.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findAllByOrderByCreatedAtDesc();

    List<Booking> findByStatusOrderByCreatedAtDesc(BookingStatus status);

    List<Booking> findByUserIdOrderByStartTimeDesc(Long userId);

    // Bookings of one resource that overlap the window [start, end): they start before it ends
    // and end after it starts. Used to detect clashes.
    List<Booking> findByResourceIdAndStatusAndStartTimeLessThanAndEndTimeGreaterThan(
            Long resourceId, BookingStatus status, LocalDateTime end, LocalDateTime start);

    // Upcoming (or still running) bookings of one resource, soonest first.
    List<Booking> findByResourceIdAndStatusAndEndTimeGreaterThanOrderByStartTimeAsc(
            Long resourceId, BookingStatus status, LocalDateTime after);

}
