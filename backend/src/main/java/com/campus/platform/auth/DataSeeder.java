package com.campus.platform.auth;

import com.campus.platform.entity.Role;
import com.campus.platform.entity.User;
import com.campus.platform.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates one admin and one student account on first start so you can log in straight away. */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seed("Campus Admin", "admin@campus.edu", "admin123", Role.ADMIN);
        seed("Demo Student", "student@campus.edu", "student123", Role.STUDENT);
    }

    private void seed(String name, String email, String password, Role role) {
        if (userRepository.existsByEmailIgnoreCase(email)) return;
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        userRepository.save(user);
    }

}
