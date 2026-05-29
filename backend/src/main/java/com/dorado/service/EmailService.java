package com.dorado.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    private final String resetTemplate;
    private final String verifyTemplate;

    @Value("${app.frontend-url:http://localhost:8081}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
        this.resetTemplate = loadTemplate("templates/email-reset-password.html", "Has solicitado restablecer tu contrasena. Ingresa a: __RESET_URL__");
        this.verifyTemplate = loadTemplate("templates/email-verify.html", "Confirma tu correo. Ingresa a: __VERIFY_URL__");
    }

    private String loadTemplate(String path, String fallback) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            Scanner scanner = new Scanner(resource.getInputStream(), StandardCharsets.UTF_8);
            String content = scanner.useDelimiter("\\A").next();
            scanner.close();
            log.info("Template cargado: {}", path);
            return content;
        } catch (Exception e) {
            log.error("Error cargando template {}, usando fallback", path, e);
            return fallback;
        }
    }

    @Async
    public void sendResetEmail(String to, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        log.info("Enviando correo de recuperacion a: {}", to);

        String html = resetTemplate.replace("__RESET_URL__", resetUrl);

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject("Recupera tu contrasena - El Dorado");
            helper.setText(html, true);
            mailSender.send(mime);
            log.info("Correo enviado exitosamente a: {}", to);
        } catch (Exception e) {
            log.error("Error al enviar correo de recuperacion a {}: {}", to, e.getMessage(), e);
        }
    }

    @Async
    public void sendVerificationEmail(String to, String token) {
        String verifyUrl = frontendUrl + "/verify-email?token=" + token;
        log.info("Enviando correo de verificacion a: {}", to);

        String html = verifyTemplate.replace("__VERIFY_URL__", verifyUrl);

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject("Confirma tu correo - El Dorado");
            helper.setText(html, true);
            mailSender.send(mime);
            log.info("Correo de verificacion enviado a: {}", to);
        } catch (Exception e) {
            log.error("Error al enviar verificacion a {}: {}", to, e.getMessage(), e);
        }
    }
}
