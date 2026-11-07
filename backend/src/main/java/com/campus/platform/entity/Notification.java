package com.campus.platform.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Who receives it.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 300)
    private String message;

    // Which page of the app the notification points to: "bookings" or "maintenance".
    @Column(nullable = false)
    private String target;

    // Named "seen" because READ is a reserved word in MySQL.
    @Column(nullable = false)
    private boolean seen = false;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

}
