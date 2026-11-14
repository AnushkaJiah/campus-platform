package com.campus.platform.repository;

import com.campus.platform.entity.SensorReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {

    List<SensorReading> findByResourceIdOrderByTimestampDesc(Long resourceId);

    Optional<SensorReading> findTopByResourceIdOrderByTimestampDesc(Long resourceId);

    List<SensorReading> findTop50ByOrderByTimestampDesc();

    // Analytics: only the columns we need, no entities - keeps big date ranges cheap.
    // Row layout: [0] resource id, [1] timestamp, [2] occupancy, [3] energy kWh, [4] temperature.
    @Query("select s.resource.id, s.timestamp, s.occupancyCount, s.energyConsumptionKwh, s.temperatureCelsius "
            + "from SensorReading s where s.timestamp >= :since")
    List<Object[]> findAnalyticsRows(@Param("since") LocalDateTime since);

}
