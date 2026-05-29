package com.dorado.controller;

import com.dorado.model.PasswordResetToken;
import com.dorado.model.Role;
import com.dorado.model.User;
import com.dorado.repository.PasswordResetTokenRepository;
import com.dorado.repository.RoleRepository;
import com.dorado.repository.UserRepository;
import com.dorado.service.EmailService;
import com.dorado.service.TokenService;
import com.dorado.util.PasswordValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final TokenService tokenService;

    public AuthController(UserRepository userRepository, RoleRepository roleRepository,
                          PasswordEncoder passwordEncoder,
                          PasswordResetTokenRepository tokenRepository, EmailService emailService,
                          TokenService tokenService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.tokenService = tokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || password == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Username and password are required");
            return ResponseEntity.badRequest().body(error);
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(username.toLowerCase());
        }

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (!user.getIsActive()) {
                Map<String, String> error = new HashMap<>();
                if (user.getVerificationToken() != null) {
                    error.put("message", "Cuenta no verificada. Revisa tu correo para activarla.");
                } else {
                    error.put("message", "Usuario inactivo. Contacta al administrador.");
                }
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (passwordEncoder.matches(password, user.getPassword())) {
                String authToken = tokenService.generateToken(user);
                Map<String, Object> response = new HashMap<>();
                response.put("id", user.getId());
                response.put("username", user.getUsername());
                response.put("firstName", user.getFirstName());
                response.put("lastName", user.getLastName());
                response.put("role", user.getRole().getName());
                response.put("email", user.getEmail());
                response.put("phone", user.getPhone() != null ? user.getPhone() : "");
                response.put("token", authToken);
                return ResponseEntity.ok(response);
            }
        }

        Map<String, String> error = new HashMap<>();
        error.put("message", "Credenciales incorrectas");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false));
        }

        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(token);
        if (tokenOpt.isEmpty() || tokenOpt.get().isUsed() || tokenOpt.get().isExpired()) {
            return ResponseEntity.ok(Map.of("valid", false));
        }

        return ResponseEntity.ok(Map.of("valid", true));
    }

    @PostMapping("/register-client")
    public ResponseEntity<?> registerClient(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String phone = body.get("phone");
        String password = body.get("password");

        if (name == null || name.isBlank() || email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Todos los campos son obligatorios"));
        }

        String emailClean = email.trim().toLowerCase();

        if (userRepository.findByEmail(emailClean).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Este correo ya está registrado. Inicia sesión."));
        }

        List<String> pwdErrors = PasswordValidator.validate(password);
        if (!pwdErrors.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", PasswordValidator.formatErrors(pwdErrors)));
        }

        Optional<Role> roleOpt = roleRepository.findById(6L);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Error de configuración: rol cliente no encontrado"));
        }

        String[] nameParts = name.trim().split("\\s+", 2);
        String firstName = nameParts[0];
        String lastName = nameParts.length > 1 ? nameParts[1] : "";

        String username = emailClean;
        if (username.length() > 50) {
            username = username.substring(0, 50);
        }
        if (userRepository.findByUsername(username).isPresent()) {
            username = username + "_" + System.currentTimeMillis();
            username = username.substring(0, Math.min(username.length(), 50));
        }

        User client = new User();
        client.setUsername(username);
        client.setPassword(passwordEncoder.encode(password));
        client.setFirstName(firstName);
        client.setLastName(lastName);
        client.setEmail(emailClean);
        client.setPhone(phone != null ? phone.trim() : "");
        client.setRole(roleOpt.get());
        client.setIsActive(false);

        String verificationToken = UUID.randomUUID().toString();
        client.setVerificationToken(verificationToken);
        client.setVerificationTokenExpiry(LocalDateTime.now().plusMinutes(5));

        userRepository.save(client);

        emailService.sendVerificationEmail(client.getEmail(), verificationToken);

        return ResponseEntity.ok(Map.of("message", "Te enviamos un correo de verificación. Revisa tu bandeja de entrada para activar tu cuenta."));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token requerido"));
        }

        Optional<User> userOpt = userRepository.findByVerificationToken(token);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", "Token inválido o ya expiró"));
        }

        User user = userOpt.get();
        if (user.getVerificationTokenExpiry() == null || user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", "Token expirado. Solicita uno nuevo."));
        }

        user.setIsActive(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Correo verificado correctamente. Ya puedes iniciar sesión."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ingresa tu correo electrónico"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "El correo no está registrado en el sistema."));
        }

        User user = userOpt.get();
        if (!user.getIsActive()) {
            return ResponseEntity.badRequest().body(Map.of("message", "La cuenta está inactiva. Contacta al administrador."));
        }

        List<PasswordResetToken> oldTokens = tokenRepository.findByUserAndUsedFalse(user);
        for (PasswordResetToken t : oldTokens) {
            t.setUsed(true);
            tokenRepository.save(t);
        }

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken(user, token, LocalDateTime.now().plusMinutes(5));
        tokenRepository.save(resetToken);

        emailService.sendResetEmail(user.getEmail(), token);

        return ResponseEntity.ok(Map.of("message", "Revisa tu correo electrónico. Si el correo está registrado, recibirás instrucciones."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");

        if (token == null || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token y nueva contraseña requeridos"));
        }

        List<String> pwdErrors = PasswordValidator.validate(newPassword);
        if (!pwdErrors.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", PasswordValidator.formatErrors(pwdErrors)));
        }

        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByToken(token);
        if (tokenOpt.isEmpty() || tokenOpt.get().isUsed() || tokenOpt.get().isExpired()) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", "Token inválido o expirado. Solicita uno nuevo."));
        }

        PasswordResetToken resetToken = tokenOpt.get();
        User user = resetToken.getUser();

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "La nueva contraseña no puede ser igual a la actual."));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente. Redirigiendo al inicio de sesión..."));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("X-Auth-Token") String token) {
        tokenService.invalidateToken(token);
        return ResponseEntity.ok(Map.of("message", "Sesión cerrada"));
    }
}
