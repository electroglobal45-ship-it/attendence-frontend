-- MIGRATION: Add board background color and background image columns to boards table
ALTER TABLE boards ADD COLUMN IF NOT EXISTS background_image TEXT;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#7f7f7fff';
