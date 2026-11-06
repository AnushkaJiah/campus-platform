package com.campus.platform.controller;

import com.campus.platform.entity.Building;
import com.campus.platform.entity.Resource;
import com.campus.platform.entity.ResourceStatus;
import com.campus.platform.entity.ResourceType;
import com.campus.platform.repository.BuildingRepository;
import com.campus.platform.repository.ResourceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@CrossOrigin(origins = "http://localhost:3000")
public class ResourceController {

    private final ResourceRepository resourceRepository;
    private final BuildingRepository buildingRepository;

    public ResourceController(ResourceRepository resourceRepository, BuildingRepository buildingRepository) {
        this.resourceRepository = resourceRepository;
        this.buildingRepository = buildingRepository;
    }

    // CREATE
    // Expects JSON like:
    // { "name": "Room 204", "type": "CLASSROOM", "capacity": 40, "floor": 2, "building": { "id": 1 } }
    @PostMapping
    public ResponseEntity<Resource> createResource(@RequestBody Resource resource) {
        if (resource.getBuilding() == null || resource.getBuilding().getId() == null) {
            return ResponseEntity.badRequest().build();
        }
        Building building = buildingRepository.findById(resource.getBuilding().getId())
                .orElse(null);
        if (building == null) {
            return ResponseEntity.badRequest().build();
        }
        resource.setBuilding(building);
        if (resource.getStatus() == null) {
            resource.setStatus(ResourceStatus.AVAILABLE);
        }
        return ResponseEntity.ok(resourceRepository.save(resource));
    }

    // READ ALL (supports optional filtering, e.g. /api/resources?type=LAB&status=AVAILABLE&buildingId=1)
    @GetMapping
    public List<Resource> getAllResources(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(required = false) Long buildingId) {
        if (buildingId != null) {
            return resourceRepository.findByBuildingId(buildingId);
        } else if (type != null && status != null) {
            return resourceRepository.findByTypeAndStatus(type, status);
        } else if (type != null) {
            return resourceRepository.findByType(type);
        } else if (status != null) {
            return resourceRepository.findByStatus(status);
        }
        return resourceRepository.findAll();
    }

    // READ ONE
    @GetMapping("/{id}")
    public ResponseEntity<Resource> getResourceById(@PathVariable Long id) {
        return resourceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<Resource> updateResource(@PathVariable Long id, @RequestBody Resource updated) {
        return resourceRepository.findById(id)
                .map(existing -> {
                    existing.setName(updated.getName());
                    existing.setType(updated.getType());
                    existing.setCapacity(updated.getCapacity());
                    existing.setFloor(updated.getFloor());
                    existing.setStatus(updated.getStatus());
                    if (updated.getBuilding() != null && updated.getBuilding().getId() != null) {
                        buildingRepository.findById(updated.getBuilding().getId())
                                .ifPresent(existing::setBuilding);
                    }
                    return ResponseEntity.ok(resourceRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        if (!resourceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        resourceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}
