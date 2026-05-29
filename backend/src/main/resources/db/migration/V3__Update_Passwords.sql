-- Update seed user passwords to the correct BCrypt hash of '123456'
UPDATE users SET password = '$2a$10$lutzLYRQpJw2RMeDdjE9Ferj8aY.463ncVrOROkIxq0.UQUQ36A3y';
