package com.campus.platform.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "resources")
@Getter
@Setter
@NoArgsConstructor
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // e.g. "Room 204", "Chemistry Lab 2", "Silent Study Zone"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceType type;

    private Integer capacity;

    private Integer floor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceStatus status = ResourceStatus.AVAILABLE;

    // Changed from LAZY to EAGER: since Building.resources is now @JsonIgnore,
    // nothing else forces this proxy to load before Jackson tries to serialize
    // it, which caused a "No serializer found for ByteBuddyInterceptor" error.
    // EAGER guarantees a real, fully-loaded Building object every time.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

}
