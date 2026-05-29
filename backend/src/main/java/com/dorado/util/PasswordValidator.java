package com.dorado.util;

import java.util.ArrayList;
import java.util.List;

public class PasswordValidator {

    private PasswordValidator() {}

    public static List<String> validate(String password) {
        List<String> errors = new ArrayList<>();

        if (password == null || password.isBlank()) {
            errors.add("La contraseña no puede estar vacía");
            return errors;
        }

        if (password.length() < 8) {
            errors.add("Debe tener al menos 8 caracteres");
        }

        if (!password.matches(".*[A-Z].*")) {
            errors.add("Debe contener al menos una mayúscula");
        }

        if (!password.matches(".*[a-z].*")) {
            errors.add("Debe contener al menos una minúscula");
        }

        if (!password.matches(".*\\d.*")) {
            errors.add("Debe contener al menos un número");
        }

        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*")) {
            errors.add("Debe contener al menos un carácter especial (!@#$%^&*(), etc.)");
        }

        return errors;
    }

    public static String formatErrors(List<String> errors) {
        if (errors.isEmpty()) return null;
        if (errors.size() == 1) return errors.get(0);
        StringBuilder sb = new StringBuilder("La contraseña debe cumplir con los requisitos:\n");
        for (String e : errors) {
            sb.append("- ").append(e).append("\n");
        }
        return sb.toString().trim();
    }
}
