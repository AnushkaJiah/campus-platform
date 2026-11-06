package com.campus.platform.repository;

import com.campus.platform.entity.SensorReading;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {

    List<SensorReading> findByResourceIdOrderByTimestampDesc(Long resourceId);

    Optional<SensorReading> findTopByResourceIdOrderByTimestampDesc(Long resourceId);

    List<SensorReading> findTop50ByOrderByTimestampDesc();

}
