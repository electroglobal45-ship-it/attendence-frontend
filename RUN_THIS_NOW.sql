-- ============================================================================
-- SIMPLE FIX - RUN THIS NOW
-- Copy and paste this entire block into Supabase SQL Editor
-- ============================================================================

-- 1. Add checkout_selfie_url column (optional - for future use)
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS checkout_selfie_url TEXT;

-- 2. Add admin marking columns
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS admin_marked BOOLEAN DEFAULT false;

ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS admin_reason TEXT;

-- 3. Ensure gps_data is JSONB
ALTER TABLE attendance 
ALTER COLUMN gps_data TYPE JSONB USING gps_data::JSONB;

-- 4. Add some holidays for testing
INSERT INTO holidays (name, date, is_active) VALUES
('Republic Day', '2026-01-26', true),
('Holi', '2026-03-14', true),
('Good Friday', '2026-04-03', true),
('Independence Day', '2026-08-15', true),
('Gandhi Jayanti', '2026-10-02', true),
('Diwali', '2026-11-01', true),
('Christmas', '2026-12-25', true)
ON CONFLICT (date) DO UPDATE SET is_active = true;

-- 4. Verify
SELECT 'Columns added:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND column_name IN ('checkout_selfie_url', 'gps_data', 'admin_marked', 'admin_reason');

SELECT 'Holidays added:' as status;
SELECT COUNT(*) as total FROM holidays WHERE is_active = true;

-- ============================================================================
-- DONE! Now deploy your code.
-- ============================================================================
