ALTER TABLE users ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL AFTER is_active;
ALTER TABLE users ADD COLUMN verification_token_expiry DATETIME DEFAULT NULL AFTER verification_token;
