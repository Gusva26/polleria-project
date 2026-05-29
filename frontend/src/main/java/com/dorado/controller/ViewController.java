package com.dorado.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @Value("${app.backend-url:http://localhost:8080/api}")
    private String backendUrl;

    private void setupModel(Model model) {
        model.addAttribute("backendUrl", backendUrl);
    }

    @GetMapping("/")
    public String home(Model model) {
        setupModel(model);
        return "home";
    }

    @GetMapping("/login")
    public String login(Model model) {
        setupModel(model);
        return "login";
    }

    @GetMapping("/admin")
    public String admin(Model model) {
        setupModel(model);
        model.addAttribute("defaultTab", "dashboard");
        return "admin";
    }

    @GetMapping("/pos")
    public String pos(Model model) {
        setupModel(model);
        model.addAttribute("defaultTab", "pos");
        return "pos";
    }

    @GetMapping("/cocina")
    public String cocina(Model model) {
        setupModel(model);
        model.addAttribute("defaultTab", "cocina");
        return "cocina";
    }

    @GetMapping("/mesero")
    public String mesero(Model model) {
        setupModel(model);
        model.addAttribute("defaultTab", "mesero");
        return "mesero";
    }

    @GetMapping("/repartidor")
    public String repartidor(Model model) {
        setupModel(model);
        model.addAttribute("defaultTab", "repartidor");
        return "repartidor";
    }

    @GetMapping("/forgot-password")
    public String forgotPassword(Model model) {
        setupModel(model);
        return "forgot-password";
    }

    @GetMapping("/reset-password")
    public String resetPassword(Model model) {
        setupModel(model);
        return "reset-password";
    }

    @GetMapping("/verify-email")
    public String verifyEmail(Model model) {
        setupModel(model);
        return "verify-email";
    }
}
