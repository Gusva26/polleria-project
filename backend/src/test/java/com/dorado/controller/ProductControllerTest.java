package com.dorado.controller;

import com.dorado.config.JwtTokenProvider;
import com.dorado.config.UserDetailsImpl;
import com.dorado.model.Category;
import com.dorado.model.Product;
import com.dorado.model.Role;
import com.dorado.model.User;
import com.dorado.repository.CategoryRepository;
import com.dorado.repository.ProductRepository;
import com.dorado.service.CustomUserDetailsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProductController.class)
@ActiveProfiles("test")
@Import(com.dorado.config.SecurityConfig.class)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductRepository productRepository;

    @MockBean
    private CategoryRepository categoryRepository;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        user.setUsername("testuser");
        user.setRole(new Role(1L, "ADMIN"));
        UserDetails userDetails = new UserDetailsImpl(user);
        when(userDetailsService.loadUserById(anyLong())).thenReturn(userDetails);
    }

    private Product createProduct(Long id, String name, BigDecimal price, boolean active) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setPrice(price);
        p.setIsActive(active);
        return p;
    }

    @Test
    void getAllProducts_ShouldReturnList() throws Exception {
        when(jwtTokenProvider.validateToken("test-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("test-token")).thenReturn("1");
        when(productRepository.findAll()).thenReturn(List.of(
                createProduct(1L, "Pollo Braseado", BigDecimal.valueOf(25.00), true)
        ));

        mockMvc.perform(get("/products")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Pollo Braseado"));
    }

    @Test
    void getProductById_WhenExists_ShouldReturn200() throws Exception {
        when(jwtTokenProvider.validateToken("test-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("test-token")).thenReturn("1");
        when(productRepository.findById(1L)).thenReturn(Optional.of(
                createProduct(1L, "Pollo Braseado", BigDecimal.valueOf(25.00), true)
        ));

        mockMvc.perform(get("/products/1")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk());
    }

    @Test
    void getProductById_WhenNotExists_ShouldReturn404() throws Exception {
        when(jwtTokenProvider.validateToken("test-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("test-token")).thenReturn("1");
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/products/99")
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createProduct_ShouldReturn201() throws Exception {
        when(jwtTokenProvider.validateToken("test-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("test-token")).thenReturn("1");
        Product product = createProduct(null, "Nuevo Producto", BigDecimal.valueOf(15.00), true);
        Product saved = createProduct(1L, "Nuevo Producto", BigDecimal.valueOf(15.00), true);

        when(productRepository.save(any())).thenReturn(saved);

        mockMvc.perform(post("/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(product))
                        .header("Authorization", "Bearer test-token"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }
}
