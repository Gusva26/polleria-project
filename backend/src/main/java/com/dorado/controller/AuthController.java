package com.dorado.controller;

import com.dorado.config.JwtTokenProvider;
import com.dorado.exception.BadRequestException;
import com.dorado.exception.DuplicateResourceException;
import com.dorado.exception.ResourceNotFoundException;
import com.dorado.exception.UnauthorizedException;
import com.dorado.model.PasswordResetToken;
import com.dorado.model.Role;
import com.dorado.model.User;
import com.dorado.repository.PasswordResetTokenRepository;
import com.dorado.repository.RoleRepository;
import com.dorado.repository.UserRepository;
import com.dorado.service.EmailService;
import com.dorado.util.PasswordValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthController(UserRepository userRepository, RoleRepository roleRepository,
                          PasswordEncoder passwordEncoder,
                          PasswordResetTokenRepository tokenRepository, EmailService emailService,
                          AuthenticationManager authenticationManager, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || password == null) {
            throw new BadRequestException("Username and password are required");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );

        User user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByEmail(username.toLowerCase())
                        .orElseThrow(() -> new UnauthorizedException("Credenciales incorrectas")));

        if (!user.getIsActive()) {
            if (user.getVerificationToken() != null) {
                throw new UnauthorizedException("Cuenta no verificada. Revisa tu correo para activarla.");
            }
            throw new UnauthorizedException("Usuario inactivo. Contacta al administrador.");
        }

        String authToken = jwtTokenProvider.generateToken(user);
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

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Token requerido");
        }

        boolean valid = tokenRepository.findByToken(token)
                .filter(t -> !t.isUsed() && !t.isExpired())
                .isPresent();

        return ResponseEntity.ok(Map.of("valid", valid));
    }

    @PostMapping("/register-client")
    public ResponseEntity<?> registerClient(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String phone = body.get("phone");
        String password = body.get("password");

        if (name == null || name.isBlank() || email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new BadRequestException("Todos los campos son obligatorios");
        }

        String emailClean = email.trim().toLowerCase();

        if (userRepository.findByEmail(emailClean).isPresent()) {
            throw new DuplicateResourceException("Este correo ya está registrado. Inicia sesión.");
        }

        List<String> pwdErrors = PasswordValidator.validate(password);
        if (!pwdErrors.isEmpty()) {
            throw new BadRequestException(PasswordValidator.formatErrors(pwdErrors));
        }

        Role role = roleRepository.findById(6L)
                .orElseThrow(() -> new BadRequestException("Error de configuración: rol cliente no encontrado"));

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
        client.setRole(role);
        client.setIsActive(false);

        String verificationToken = UUID.randomUUID().toString();
        client.setVerificationToken(verificationToken);
        client.setVerificationTokenExpiry(LocalDateTime.now().plusMinutes(5));

        userRepository.save(client);

        emailService.sendVerificationEmail(client.getEmail(), verificationToken);

        return ResponseEntity.ok(Map.of("message", "Te enviamos un correo de verificaci\u00f3n. Revisa tu bandeja de entrada para activar tu cuenta."));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Token requerido");
        }

        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new BadRequestException("Token inv\u00e1lido o ya expir\u00f3"));

        if (user.getVerificationTokenExpiry() == null || user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Token expirado. Solicita uno nuevo.");
        }

        user.setIsActive(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Correo verificado correctamente. Ya puedes iniciar sesi\u00f3n."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Ingresa tu correo electr\u00f3nico");
        }

        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "email", email));

        if (!user.getIsActive()) {
            throw new BadRequestException("La cuenta est\u00e1 inactiva. Contacta al administrador.");
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

        return ResponseEntity.ok(Map.of("message", "Revisa tu correo electr\u00f3nico. Si el correo est\u00e1 registrado, recibir\u00e1s instrucciones."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");

        if (token == null || newPassword == null || newPassword.isBlank()) {
            throw new BadRequestException("Token y nueva contrase\u00f1a requeridos");
        }

        List<String> pwdErrors = PasswordValidator.validate(newPassword);
        if (!pwdErrors.isEmpty()) {
            throw new BadRequestException(PasswordValidator.formatErrors(pwdErrors));
        }

        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .filter(t -> !t.isUsed() && !t.isExpired())
                .orElseThrow(() -> new BadRequestException("Token inv\u00e1lido o expirado. Solicita uno nuevo."));

        User user = resetToken.getUser();

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("La nueva contrase\u00f1a no puede ser igual a la actual.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        return ResponseEntity.ok(Map.of("message", "Contrase\u00f1a actualizada correctamente. Redirigiendo al inicio de sesi\u00f3n..."));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        return ResponseEntity.ok(Map.of("message", "Sesión cerrada"));
    }
}
