package com.campus.platform.analytics;

import com.campus.platform.entity.Alert;
import com.campus.platform.entity.AlertType;
import com.campus.platform.entity.Resource;
import com.campus.platform.repository.AlertRepository;
import com.campus.platform.repository.ResourceRepository;
import com.campus.platform.repository.SensorReadingRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Utilization analytics. Everything is computed from the sensor readings the simulator (or real sensors)
 * has posted: utilization = occupancy / capacity. Admin only (see SecurityConfig - it falls through to
 * the admin rule).
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    public record DayPoint(LocalDate date, Double avgUtilizationPercent, Double energyKwh,
                           Double avgTemperature, long readings) {}

    public record HourPoint(int hour, Double avgUtilizationPercent) {}

    public record RoomStat(Long resourceId, String name, String type, String building, Integer capacity,
                           Double avgUtilizationPercent, Double peakUtilizationPercent,
                           Double energyKwh, long readings) {}

    public record AlertCount(String type, long count) {}

    public record Totals(long readings, Double avgUtilizationPercent, Double energyKwh, long alerts) {}

    public record Summary(int days, LocalDateTime from, LocalDateTime to, Totals totals,
                          List<DayPoint> daily, List<HourPoint> hourly, List<RoomStat> rooms,
                          List<AlertCount> alerts) {}

    /** Running totals for one bucket (a day, an hour of the day, a room, or the whole campus). */
    private static class Acc {
        double utilSum;
        long utilCount;
        double utilPeak;
        double energy;
        double tempSum;
        long tempCount;
        long readings;

        void add(Double util, Double energyKwh, Double temperature) {
            readings++;
            if (util != null) {
                utilSum += util;
                utilCount++;
                utilPeak = Math.max(utilPeak, util);
            }
            if (energyKwh != null) energy += energyKwh;
            if (temperature != null) {
                tempSum += temperature;
                tempCount++;
            }
        }

        Double avgUtil() { return utilCount == 0 ? null : round1(utilSum / utilCount); }
        Double avgTemp() { return tempCount == 0 ? null : round1(tempSum / tempCount); }
    }

    private static final int OPERATING_START_HOUR = 8;   // 08:00
    private static final int OPERATING_END_HOUR = 20;    // up to 20:00

    private final SensorReadingRepository readingRepository;
    private final ResourceRepository resourceRepository;
    private final AlertRepository alertRepository;

    public AnalyticsController(SensorReadingRepository readingRepository,
                               ResourceRepository resourceRepository,
                               AlertRepository alertRepository) {
        this.readingRepository = readingRepository;
        this.resourceRepository = resourceRepository;
        this.alertRepository = alertRepository;
    }

    @GetMapping("/summary")
    public Summary summary(@RequestParam(defaultValue = "7") int days) {
        int range = Math.max(1, Math.min(days, 90));
        LocalDate today = LocalDate.now();
        LocalDateTime from = today.minusDays(range - 1L).atStartOfDay();
        LocalDateTime to = LocalDateTime.now();

        List<Resource> resources = resourceRepository.findAll();
        Map<Long, Resource> byId = new HashMap<>();
        for (Resource r : resources) byId.put(r.getId(), r);

        Acc campus = new Acc();
        Map<LocalDate, Acc> perDay = new HashMap<>();
        Acc[] perHour = new Acc[24];
        for (int h = 0; h < 24; h++) perHour[h] = new Acc();
        Map<Long, Acc> perRoom = new HashMap<>();

        for (Object[] row : readingRepository.findAnalyticsRows(from)) {
            Long resourceId = ((Number) row[0]).longValue();
            LocalDateTime timestamp = (LocalDateTime) row[1];
            Double occupancy = row[2] == null ? null : ((Number) row[2]).doubleValue();
            Double energy = row[3] == null ? null : ((Number) row[3]).doubleValue();
            Double temperature = row[4] == null ? null : ((Number) row[4]).doubleValue();

            Resource resource = byId.get(resourceId);
            Double util = null;
            if (resource != null && resource.getCapacity() != null && resource.getCapacity() > 0
                    && occupancy != null) {
                util = occupancy / resource.getCapacity() * 100.0;
            }

            // Utilization averages only count operating hours, so empty nights do not make every room look
            // under-used. The hour-by-hour chart still uses all 24 hours.
            boolean operatingHours = timestamp.getHour() >= OPERATING_START_HOUR && timestamp.getHour() < OPERATING_END_HOUR;
            Double averagedUtil = operatingHours ? util : null;

            campus.add(averagedUtil, energy, temperature);
            perDay.computeIfAbsent(timestamp.toLocalDate(), d -> new Acc()).add(averagedUtil, energy, temperature);
            perHour[timestamp.getHour()].add(util, energy, temperature);
            perRoom.computeIfAbsent(resourceId, id -> new Acc()).add(averagedUtil, energy, temperature);
        }

        // Every day in the range appears, even with no data, so the chart's time axis has no gaps.
        List<DayPoint> daily = new ArrayList<>();
        for (int i = range - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Acc a = perDay.get(date);
            daily.add(a == null
                    ? new DayPoint(date, null, null, null, 0)
                    : new DayPoint(date, a.avgUtil(), round1(a.energy), a.avgTemp(), a.readings));
        }

        List<HourPoint> hourly = new ArrayList<>();
        for (int h = 0; h < 24; h++) hourly.add(new HourPoint(h, perHour[h].avgUtil()));

        List<RoomStat> rooms = new ArrayList<>();
        for (Resource r : resources) {
            Acc a = perRoom.get(r.getId());
            rooms.add(new RoomStat(r.getId(), r.getName(), r.getType().name(),
                    r.getBuilding() != null ? r.getBuilding().getName() : null, r.getCapacity(),
                    a == null ? null : a.avgUtil(),
                    a == null || a.utilCount == 0 ? null : round1(a.utilPeak),
                    a == null ? null : round1(a.energy),
                    a == null ? 0 : a.readings));
        }
        // Busiest first; rooms with no data sink to the bottom.
        rooms.sort(Comparator.comparing(RoomStat::avgUtilizationPercent,
                Comparator.nullsLast(Comparator.reverseOrder())));

        List<Alert> alertsInRange = alertRepository.findByCreatedAtGreaterThanEqual(from);
        List<AlertCount> alertCounts = new ArrayList<>();
        for (AlertType type : AlertType.values()) {
            long count = alertsInRange.stream().filter(a -> a.getType() == type).count();
            alertCounts.add(new AlertCount(type.name(), count));
        }

        Totals totals = new Totals(campus.readings, campus.avgUtil(), round1(campus.energy), alertsInRange.size());
        return new Summary(range, from, to, totals, daily, hourly, rooms, alertCounts);
    }

    private static Double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

}
