-- ============================================================================
-- ATTENDANCE SYSTEM - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add checkout_selfie_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' 
        AND column_name = 'checkout_selfie_url'
    ) THEN
        ALTER TABLE attendance ADD COLUMN checkout_selfie_url TEXT;
        RAISE NOTICE 'Added checkout_selfie_url column';
    ELSE
        RAISE NOTICE 'checkout_selfie_url column already exists';
    END IF;
END $$;

-- 2. Ensure gps_data is JSONB type
DO $$ 
BEGIN
    ALTER TABLE attendance 
    ALTER COLUMN gps_data TYPE JSONB USING gps_data::JSONB;
    RAISE NOTICE 'Converted gps_data to JSONB';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'gps_data is already JSONB or conversion not needed';
END $$;

-- 3. Verify the changes
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND column_name IN ('checkout_selfie_url', 'gps_data', 'selfie_url')
ORDER BY column_name;

-- 4. Check if holidays table exists and has data
SELECT COUNT(*) as holiday_count FROM holidays WHERE is_active = true;

-- 5. Add admin marking columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' 
        AND column_name = 'admin_marked'
    ) THEN
        ALTER TABLE attendance ADD COLUMN admin_marked BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added admin_marked column';
    ELSE
        RAISE NOTICE 'admin_marked column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' 
        AND column_name = 'admin_reason'
    ) THEN
        ALTER TABLE attendance ADD COLUMN admin_reason TEXT;
        RAISE NOTICE 'Added admin_reason column';
    ELSE
        RAISE NOTICE 'admin_reason column already exists';
    END IF;
END $$;

-- 6. If no holidays, add some sample holidays for 2026
INSERT INTO holidays (name, date, is_active) 
VALUES 
    ('Republic Day', '2026-01-26', true),
    ('Holi', '2026-03-14', true),
    ('Good Friday', '2026-04-03', true),
    ('Independence Day', '2026-08-15', true),
    ('Gandhi Jayanti', '2026-10-02', true),
    ('Diwali', '2026-11-01', true),
    ('Christmas', '2026-12-25', true)
ON CONFLICT (date) DO NOTHING;

-- 6. Verify holidays were added
SELECT * FROM holidays WHERE is_active = true ORDER BY date;

-- 7. Verify all new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND column_name IN ('checkout_selfie_url', 'gps_data', 'admin_marked', 'admin_reason')
ORDER BY column_name;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- admin_marked       | boolean | YES
-- admin_reason       | text    | YES
-- checkout_selfie_url | text   | YES
-- gps_data           | jsonb  | YES
--
-- holiday_count: 7 (or more)
-- ============================================================================
