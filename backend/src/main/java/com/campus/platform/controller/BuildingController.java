package com.campus.platform.controller;

import com.campus.platform.entity.Building;
import com.campus.platform.repository.BuildingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/buildings")
@CrossOrigin(origins = "http://localhost:3000")
public class BuildingController {

    private final BuildingRepository buildingRepository;

    public BuildingController(BuildingRepository buildingRepository) {
        this.buildingRepository = buildingRepository;
    }

    // CREATE
    @PostMapping
    public Building createBuilding(@RequestBody Building building) {
        return buildingRepository.save(building);
    }

    // READ ALL
    @GetMapping
    public List<Building> getAllBuildings() {
        return buildingRepository.findAll();
    }

    // READ ONE
    @GetMapping("/{id}")
    public ResponseEntity<Building> getBuildingById(@PathVariable Long id) {
        return buildingRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<Building> updateBuilding(@PathVariable Long id, @RequestBody Building updated) {
        return buildingRepository.findById(id)
                .map(existing -> {
                    existing.setName(updated.getName());
                    existing.setCode(updated.getCode());
                    existing.setLocation(updated.getLocation());
                    existing.setTotalFloors(updated.getTotalFloors());
                    return ResponseEntity.ok(buildingRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBuilding(@PathVariable Long id) {
        if (!buildingRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        buildingRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}
