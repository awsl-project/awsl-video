-- Migration: Add is_admin column to users table
-- This allows distinguishing between regular users and admin users
-- Super admin is determined by environment variable ADMIN_USERNAME

-- Add is_admin column with default value False
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin user queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Optional: Set specific users as admin (uncomment and modify as needed)
-- UPDATE users SET is_admin = TRUE WHERE username = 'admin_username';
