package com.campus.platform.repository;

import com.campus.platform.entity.Alert;
import com.campus.platform.entity.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByResolvedFalseOrderByCreatedAtDesc();

    List<Alert> findByResourceIdOrderByCreatedAtDesc(Long resourceId);

    List<Alert> findTop50ByOrderByCreatedAtDesc();

    List<Alert> findByCreatedAtGreaterThanEqual(LocalDateTime since);

    // Used for de-duplication: don't create a new alert if an unresolved one
    // of the same type already exists for this resource.
    boolean existsByResourceIdAndTypeAndResolvedFalse(Long resourceId, AlertType type);

}
