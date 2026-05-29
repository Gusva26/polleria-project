-- Insert Roles
INSERT INTO roles (id, name) VALUES
(1, 'ROLE_ADMIN'),
(2, 'ROLE_CAJERO'),
(3, 'ROLE_COCINERO'),
(4, 'ROLE_MESERO'),
(5, 'ROLE_REPARTIDOR'),
(6, 'ROLE_CLIENTE');

-- Insert Users (Password is '123456' BCrypt hashed: $2a$10$Y5M/q89k65F7uN6Hq6w3eO3L.sK8j5O.Xk3YnU5uP18xT.hQ1eT2q)
INSERT INTO users (id, username, password, first_name, last_name, email, phone, role_id, is_active) VALUES
(1, 'admin', '$2a$10$Y5M/q89k65F7uN6Hq6w3eO3L.sK8j5O.Xk3YnU5uP18xT.hQ1eT2q', 'Admin', 'El Dorado', 'admin@eldorado.com', '999999999', 1, TRUE),
(2, 'cajero', '$2a$10$Y5M/q89k65F7uN6Hq6w3eO3L.sK8j5O.Xk3YnU5uP18xT.hQ1eT2q', 'Carlos', 'Cajero', 'cajero@eldorado.com', '988888888', 2, TRUE),
(3, 'cocinero', '$2a$10$Y5M/q89k65F7uN6Hq6w3eO3L.sK8j5O.Xk3YnU5uP18xT.hQ1eT2q', 'Chef', 'Gaston', 'cocinero@eldorado.com', '977777777', 3, TRUE),
(4, 'mesero', '$2a$10$Y5M/q89k65F7uN6Hq6w3eO3L.sK8j5O.Xk3YnU5uP18xT.hQ1eT2q', 'Mario', 'Mesero', 'mesero@eldorado.com', '966666666', 4, TRUE),
(5, 'repartidor', '$2a$10$Y5M/q89k65F7uN6Hq6w3eO3L.sK8j5O.Xk3YnU5uP18xT.hQ1eT2q', 'Ramon', 'Repartidor', 'repartidor@eldorado.com', '955555555', 5, TRUE),
(6, 'cliente', '$2a$10$Y5M/q89k65F7uN6Hq6w3eO3L.sK8j5O.Xk3YnU5uP18xT.hQ1eT2q', 'Juan', 'Perez', 'cliente@gmail.com', '944444444', 6, TRUE);

-- Insert Categories
INSERT INTO categories (id, name, description) VALUES
(1, 'Pollos a la Brasa', 'El sabor tradicional de nuestro pollo a la brasa con carbón de algarrobo'),
(2, 'Combos Dorado', 'Combos ideales para compartir en familia o con amigos'),
(3, 'Bebidas', 'Gaseosas, refrescos naturales y cervezas heladas'),
(4, 'Guarniciones', 'Papas extra, ensaladas y porciones adicionales');

-- Insert Products
INSERT INTO products (id, name, description, price, category_id, image_url, is_active) VALUES
-- Pollos
(1, '1 Pollo a la Brasa', 'Delicioso pollo entero a la brasa con papas fritas crujientes, ensalada fresca y cremas de la casa.', 75.00, 1, '/images/1_pollo.png', TRUE),
(2, '1/2 Pollo a la Brasa', 'Medio pollo a la brasa servido con papas fritas doradas, ensalada fresca y cremas.', 40.00, 1, '/images/medio_pollo.png', TRUE),
(3, '1/4 Pollo a la Brasa', 'Un cuarto de pollo a la brasa (pecho o pierna) acompañado de papas fritas y ensalada.', 22.00, 1, '/images/cuarto_pollo.png', TRUE),
-- Combos
(4, 'Combo Dorado Familiar', '1 Pollo y medio a la brasa + Papas fritas familiares + Ensalada familiar + Gaseosa Inca Kola 1.5L + Cremas.', 110.00, 2, '/images/combo_familiar.png', TRUE),
(5, 'Combo Personal Dorado', '1/4 de Pollo a la brasa + Papas fritas + Ensalada + Gaseosa personal de 500ml.', 26.00, 2, '/images/combo_personal.png', TRUE),
-- Bebidas
(6, 'Inca Kola 1.5L', 'Gaseosa Inca Kola original helada, perfecta para el almuerzo familiar.', 9.00, 3, '/images/incakola_15.png', TRUE),
(7, 'Coca Cola 1.5L', 'Gaseosa Coca Cola helada.', 9.00, 3, '/images/cocacola_15.png', TRUE),
(8, 'Chicha Morada 1L', 'Deliciosa y refrescante chicha morada natural preparada con maíz morado, piña y limón.', 12.00, 3, '/images/chicha_1l.png', TRUE),
(9, 'Agua San Mateo 500ml', 'Agua mineral con o sin gas.', 3.50, 3, '/images/agua.png', TRUE),
-- Guarniciones
(10, 'Porción de Papas Fritas Grande', 'Papas amarillas seleccionadas fritas al punto exacto de crocancia.', 15.00, 4, '/images/papas.png', TRUE),
(11, 'Porción de Ensalada Completa', 'Ensalada fresca de lechuga, tomate, pepino y zanahoria con aliño especial.', 10.00, 4, '/images/ensalada.png', TRUE),
(12, 'Porción de Aguadito', 'Sopa tradicional de pollo con arroz, culantro y verduras.', 8.00, 4, '/images/aguadito.png', TRUE);

-- Insert Restaurant Tables
INSERT INTO restaurant_tables (id, table_number, capacity, status) VALUES
(1, 'Mesa 1', 4, 'AVAILABLE'),
(2, 'Mesa 2', 4, 'AVAILABLE'),
(3, 'Mesa 3', 2, 'AVAILABLE'),
(4, 'Mesa 4', 2, 'AVAILABLE'),
(5, 'Mesa 5', 6, 'AVAILABLE'),
(6, 'Mesa 6', 6, 'AVAILABLE'),
(7, 'Mesa 7', 8, 'AVAILABLE'),
(8, 'Mesa 8', 4, 'AVAILABLE'),
(9, 'Mesa 9', 4, 'AVAILABLE'),
(10, 'Mesa 10', 2, 'AVAILABLE');
