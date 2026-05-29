package com.dorado.service;

import com.dorado.model.User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenService {

    private static class TokenInfo {
        final User user;
        final LocalDateTime expiry;

        TokenInfo(User user, LocalDateTime expiry) {
            this.user = user;
            this.expiry = expiry;
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    private final Map<String, TokenInfo> tokens = new ConcurrentHashMap<>();
    private static final long TOKEN_DURATION_HOURS = 24;

    public String generateToken(User user) {
        String token = UUID.randomUUID().toString();
        tokens.put(token, new TokenInfo(user, LocalDateTime.now().plusHours(TOKEN_DURATION_HOURS)));
        return token;
    }

    public Optional<User> validateToken(String token) {
        TokenInfo info = tokens.get(token);
        if (info == null) return Optional.empty();
        if (info.isExpired()) {
            tokens.remove(token);
            return Optional.empty();
        }
        return Optional.of(info.user);
    }

    public void invalidateToken(String token) {
        tokens.remove(token);
    }

    public void invalidateAllForUser(Long userId) {
        tokens.entrySet().removeIf(entry -> entry.getValue().user.getId().equals(userId));
    }
}
