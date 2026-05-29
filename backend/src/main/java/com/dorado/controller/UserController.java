package com.dorado.controller;

import com.dorado.model.Role;
import com.dorado.model.User;
import com.dorado.repository.RoleRepository;
import com.dorado.repository.UserRepository;
import com.dorado.util.PasswordValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/by-role")
    public List<User> getUsersByRole(@RequestParam String roleName) {
        return userRepository.findByRoleName(roleName);
    }

    @GetMapping("/roles")
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("{\"message\": \"El nombre de usuario ya existe\"}");
        }

        String rawPassword = user.getPassword();
        List<String> pwdErrors = PasswordValidator.validate(rawPassword);
        if (!pwdErrors.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", PasswordValidator.formatErrors(pwdErrors)));
        }
        
        // Hashing password
        user.setPassword(passwordEncoder.encode(rawPassword));
        
        // Match role from DB
        if (user.getRole() != null && user.getRole().getId() != null) {
            Optional<Role> roleOpt = roleRepository.findById(user.getRole().getId());
            if (roleOpt.isPresent()) {
                user.setRole(roleOpt.get());
            } else {
                return ResponseEntity.badRequest().body("{\"message\": \"Rol inválido\"}");
            }
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(userRepository.save(user));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return userRepository.findById(id).map(user -> {
            if (body.containsKey("isActive")) {
                user.setIsActive(body.get("isActive"));
            }
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User userDetails) {
        return userRepository.findById(id).map(user -> {
            // Check username unique if changed
            if (!user.getUsername().equals(userDetails.getUsername()) && 
                userRepository.findByUsername(userDetails.getUsername()).isPresent()) {
                return ResponseEntity.badRequest().body("{\"message\": \"El nombre de usuario ya existe\"}");
            }
            
            user.setUsername(userDetails.getUsername());
            user.setFirstName(userDetails.getFirstName());
            user.setLastName(userDetails.getLastName());
            user.setEmail(userDetails.getEmail());
            user.setPhone(userDetails.getPhone());
            user.setIsActive(userDetails.getIsActive());
            
            // Password update (only if a new one is provided)
            if (userDetails.getPassword() != null && !userDetails.getPassword().trim().isEmpty()) {
                String rawPassword = userDetails.getPassword().trim();
                if (passwordEncoder.matches(rawPassword, user.getPassword())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "La nueva contraseña no puede ser igual a la actual."));
                }
                List<String> pwdErrors = PasswordValidator.validate(rawPassword);
                if (!pwdErrors.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("message", PasswordValidator.formatErrors(pwdErrors)));
                }
                user.setPassword(passwordEncoder.encode(rawPassword));
            }
            
            // Match role
            if (userDetails.getRole() != null && userDetails.getRole().getId() != null) {
                roleRepository.findById(userDetails.getRole().getId()).ifPresent(user::setRole);
            }
            
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setIsActive(false); // Soft delete to preserve referential integrity
            userRepository.save(user);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
