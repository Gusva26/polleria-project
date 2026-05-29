UPDATE order_items oi
JOIN orders o ON o.id = oi.order_id
SET oi.is_served = 1
WHERE o.status IN ('SERVED', 'COMPLETED', 'CANCELLED', 'SHIPPED', 'DELIVERED');
