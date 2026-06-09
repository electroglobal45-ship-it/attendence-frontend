-- Diagnostic query to check the current structure of task_attachments table
-- Run this FIRST in your Supabase SQL Editor to see what columns exist

-- Check if the table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'task_attachments'
    ) 
    THEN 'Table EXISTS' 
    ELSE 'Table DOES NOT EXIST' 
  END AS table_status;

-- List all columns in the table (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'task_attachments'
ORDER BY ordinal_position;

-- Show what columns are MISSING that the code expects
SELECT 
  'file_type' AS expected_column,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'task_attachments' 
      AND column_name = 'file_type'
    ) 
    THEN '✓ EXISTS' 
    ELSE '✗ MISSING' 
  END AS status
UNION ALL
SELECT 
  'file_size' AS expected_column,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'task_attachments' 
      AND column_name = 'file_size'
    ) 
    THEN '✓ EXISTS' 
    ELSE '✗ MISSING' 
  END AS status
UNION ALL
SELECT 
  'user_id' AS expected_column,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'task_attachments' 
      AND column_name = 'user_id'
    ) 
    THEN '✓ EXISTS' 
    ELSE '✗ MISSING' 
  END AS status;
