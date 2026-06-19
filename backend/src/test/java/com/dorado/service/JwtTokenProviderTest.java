package com.dorado.service;

import com.dorado.config.JwtTokenProvider;
import com.dorado.model.Role;
import com.dorado.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(
                "404E635266556A586E3272357538782F413F4428472B4B6250655368566D5970",
                3600000L
        );
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setRole(new Role(1L, "ADMIN"));
    }

    @Test
    void generateToken_ShouldReturnValidToken() {
        String token = jwtTokenProvider.generateToken(testUser);
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    void validateToken_WithInvalidToken_ShouldReturnFalse() {
        assertFalse(jwtTokenProvider.validateToken("invalid-token"));
    }

    @Test
    void validateToken_WithExpiredToken_ShouldReturnFalse() {
        JwtTokenProvider expiredProvider = new JwtTokenProvider(
                "404E635266556A586E3272357538782F413F4428472B4B6250655368566D5970",
                -1000L
        );
        String token = expiredProvider.generateToken(testUser);
        assertFalse(expiredProvider.validateToken(token));
    }

    @Test
    void getUserIdFromToken_ShouldReturnCorrectId() {
        String token = jwtTokenProvider.generateToken(testUser);
        assertEquals("1", jwtTokenProvider.getUserIdFromToken(token));
    }
}
