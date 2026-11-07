package com.campus.platform.repository;

import com.campus.platform.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop30ByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndSeenFalse(Long userId);

    List<Notification> findByUserIdAndSeenFalse(Long userId);

}
