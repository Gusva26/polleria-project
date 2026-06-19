package com.dorado.service;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @Test
    void sendResetEmail_ShouldSendMail() {
        when(mailSender.createMimeMessage()).thenReturn(null);
        emailService.sendResetEmail("test@test.com", "token123");
        verify(mailSender).createMimeMessage();
    }

    @Test
    void sendVerificationEmail_ShouldSendMail() {
        when(mailSender.createMimeMessage()).thenReturn(null);
        emailService.sendVerificationEmail("test@test.com", "token123");
        verify(mailSender).createMimeMessage();
    }
}
