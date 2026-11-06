package com.campus.platform.auth;

import com.campus.platform.entity.Role;
import com.campus.platform.entity.User;
import com.campus.platform.repository.UserRepository;
import com.campus.platform.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String email, String password) {}

    public record RegisterRequest(String name, String email, String password) {}

    public record AuthResponse(String token, String name, String email, String role) {}

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (request.email() == null || request.password() == null) {
            return error(HttpStatus.BAD_REQUEST, "Email and password are required.");
        }
        return userRepository.findByEmailIgnoreCase(request.email().trim())
                .filter(user -> passwordEncoder.matches(request.password(), user.getPasswordHash()))
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(toResponse(user)))
                // Same message for "no such user" and "wrong password" so accounts can't be guessed.
                .orElseGet(() -> error(HttpStatus.UNAUTHORIZED, "Incorrect email or password."));
    }

    // Public sign-up always creates a STUDENT. Admin accounts can only be created by seeding or by hand in the database.
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (isBlank(request.name()) || isBlank(request.email()) || isBlank(request.password())) {
            return error(HttpStatus.BAD_REQUEST, "Name, email and password are required.");
        }
        if (request.password().length() < 6) {
            return error(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters.");
        }
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return error(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.STUDENT);
        userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(user));
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(jwtService.createToken(user), user.getName(), user.getEmail(), user.getRole().name());
    }

    private static ResponseEntity<?> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

}
