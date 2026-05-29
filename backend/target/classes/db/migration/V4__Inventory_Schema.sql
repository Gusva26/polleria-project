-- Create Inventory Items Table
CREATE TABLE inventory_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL,
    minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Inventory Transactions Table
CREATE TABLE inventory_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inventory_item_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- ENTRY, EXIT
    quantity DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

-- Seed some default inventory items
INSERT INTO inventory_items (name, stock, unit, minimum_stock) VALUES
('Pollo Entero Fresco', 50.00, 'Unidades', 15.00),
('Papas Seleccionadas', 120.00, 'Kg', 30.00),
('Carbón de Algarrobo', 15.00, 'Sacos', 5.00),
('Aceite Vegetal', 40.00, 'Litros', 10.00),
('Gaseosa Inca Kola 1.5L', 80.00, 'Unidades', 20.00),
('Gaseosa Coca Cola 1.5L', 60.00, 'Unidades', 15.00);
