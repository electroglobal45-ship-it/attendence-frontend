-- ============================================================================
-- ADD MARKOUT_SELFIE_URL COLUMN
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add the column if it doesn't exist
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS markout_selfie_url TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND column_name = 'markout_selfie_url';

-- Expected output:
-- markout_selfie_url | text | YES

-- ============================================================================
-- DONE! Now mark out will work without errors
-- ============================================================================
