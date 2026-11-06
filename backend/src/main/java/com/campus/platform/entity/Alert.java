package com.campus.platform.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
@Getter
@Setter
@NoArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource resource;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    @Column(nullable = false)
    private String message;

    @Column(nullable = false)
    private boolean resolved = false;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Alert(Resource resource, AlertType type, AlertSeverity severity, String message) {
        this.resource = resource;
        this.type = type;
        this.severity = severity;
        this.message = message;
    }

}
