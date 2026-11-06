package com.campus.platform.service;

import com.campus.platform.entity.*;
import com.campus.platform.repository.AlertRepository;
import org.springframework.stereotype.Service;

@Service
public class AlertService {

    // ---- Thresholds (tweak these as needed) ----
    private static final double MAX_NORMAL_TEMP_C = 28.0;
    private static final double MIN_NORMAL_TEMP_C = 16.0;
    private static final double MAX_NORMAL_HUMIDITY_PCT = 70.0;

    private final AlertRepository alertRepository;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    /**
     * Runs all three smart alert rules against one new sensor reading.
     * Called automatically every time the IoT simulator posts a reading.
     */
    public void evaluateReading(SensorReading reading) {
        checkEnergyWaste(reading);
        checkOvercrowding(reading);
        checkEnvironmental(reading);
    }

    // Rule 1: empty room but AC and/or lights still running -> energy wastage
    private void checkEnergyWaste(SensorReading reading) {
        boolean isEmpty = reading.getOccupancyCount() != null && reading.getOccupancyCount() == 0;
        boolean poweredOn = Boolean.TRUE.equals(reading.getAcOn()) || Boolean.TRUE.equals(reading.getLightsOn());

        if (isEmpty && poweredOn) {
            String runningWhat = Boolean.TRUE.equals(reading.getAcOn()) && Boolean.TRUE.equals(reading.getLightsOn())
                    ? "AC and lights are"
                    : Boolean.TRUE.equals(reading.getAcOn()) ? "AC is" : "Lights are";

            createAlertIfNotDuplicate(
                    reading.getResource(),
                    AlertType.ENERGY_WASTE,
                    AlertSeverity.MEDIUM,
                    String.format("%s empty but %s still running - energy being wasted.",
                            reading.getResource().getName(), runningWhat)
            );
        }
    }

    // Rule 2: occupancy exceeds the room's stated capacity -> overcrowding
    private void checkOvercrowding(SensorReading reading) {
        Integer capacity = reading.getResource().getCapacity();
        Integer occupancy = reading.getOccupancyCount();

        if (capacity != null && occupancy != null && occupancy > capacity) {
            int over = occupancy - capacity;
            createAlertIfNotDuplicate(
                    reading.getResource(),
                    AlertType.OVERCROWDING,
                    AlertSeverity.HIGH,
                    String.format("%s is overcrowded: %d people in a room rated for %d (%d over capacity).",
                            reading.getResource().getName(), occupancy, capacity, over)
            );
        }
    }

    // Rule 3: temperature or humidity outside the normal operating range -> environmental alert
    private void checkEnvironmental(SensorReading reading) {
        Double temp = reading.getTemperatureCelsius();
        Double humidity = reading.getHumidityPercent();

        if (temp != null && (temp > MAX_NORMAL_TEMP_C || temp < MIN_NORMAL_TEMP_C)) {
            createAlertIfNotDuplicate(
                    reading.getResource(),
                    AlertType.ENVIRONMENTAL,
                    AlertSeverity.HIGH,
                    String.format("%s has an unusual temperature: %.1f\u00b0C (normal range is %.0f-%.0f\u00b0C).",
                            reading.getResource().getName(), temp, MIN_NORMAL_TEMP_C, MAX_NORMAL_TEMP_C)
            );
        }

        if (humidity != null && humidity > MAX_NORMAL_HUMIDITY_PCT) {
            createAlertIfNotDuplicate(
                    reading.getResource(),
                    AlertType.ENVIRONMENTAL,
                    AlertSeverity.MEDIUM,
                    String.format("%s has unusually high humidity: %.1f%% (normal is under %.0f%%).",
                            reading.getResource().getName(), humidity, MAX_NORMAL_HUMIDITY_PCT)
            );
        }
    }

    // Only creates a new alert if there isn't already an unresolved one of the
    // same type for this resource. This stops the same problem (e.g. an empty
    // room with the AC still running) from spamming a new alert every 5 seconds
    // while the underlying condition hasn't changed.
    private void createAlertIfNotDuplicate(Resource resource, AlertType type, AlertSeverity severity, String message) {
        boolean alreadyActive = alertRepository.existsByResourceIdAndTypeAndResolvedFalse(resource.getId(), type);
        if (alreadyActive) {
            return;
        }
        Alert alert = new Alert(resource, type, severity, message);
        alertRepository.save(alert);
    }

}
