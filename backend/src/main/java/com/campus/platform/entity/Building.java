package com.campus.platform.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "buildings")
@Getter
@Setter
@NoArgsConstructor
public class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String code; // e.g. "ENG-A", "LIB"

    private String location;

    private Integer totalFloors;

    // @JsonIgnore prevents infinite Building -> Resource -> Building -> ... loops
    // when this entity is serialized to JSON. To see a building's resources,
    // use GET /api/resources?buildingId={id} instead.
    @JsonIgnore
    @OneToMany(mappedBy = "building", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Resource> resources = new ArrayList<>();

}
