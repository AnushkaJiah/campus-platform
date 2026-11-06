package com.campus.platform.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_readings")
@Getter
@Setter
@NoArgsConstructor
public class SensorReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Changed from LAZY to EAGER for the same reason as Resource.building:
    // without another field forcing this to load first, Jackson tries to
    // serialize the raw un-loaded Hibernate proxy and crashes.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    private Double temperatureCelsius;

    private Double humidityPercent;

    private Integer occupancyCount;

    private Boolean acOn = false;

    private Boolean lightsOn = false;

    private Double energyConsumptionKwh;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

}
