package com.campus.platform.repository;

import com.campus.platform.entity.MaintenanceRequest;
import com.campus.platform.entity.MaintenanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, Long> {

    List<MaintenanceRequest> findAllByOrderByCreatedAtDesc();

    List<MaintenanceRequest> findByReportedByIdOrderByCreatedAtDesc(Long userId);

    // Is anything still being worked on for this room? Used to decide when it can go back to AVAILABLE.
    boolean existsByResourceIdAndStatusIn(Long resourceId, Collection<MaintenanceStatus> statuses);

}
