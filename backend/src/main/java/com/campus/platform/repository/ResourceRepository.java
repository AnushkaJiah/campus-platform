package com.campus.platform.repository;

import com.campus.platform.entity.Resource;
import com.campus.platform.entity.ResourceStatus;
import com.campus.platform.entity.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResourceRepository extends JpaRepository<Resource, Long> {

    List<Resource> findByType(ResourceType type);

    List<Resource> findByStatus(ResourceStatus status);

    List<Resource> findByTypeAndStatus(ResourceType type, ResourceStatus status);

    List<Resource> findByBuildingId(Long buildingId);

}
