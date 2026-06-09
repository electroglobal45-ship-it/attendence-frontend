-- Check ALL columns in task_attachments table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'task_attachments'
ORDER BY ordinal_position;

-- Also show what columns the CODE expects
SELECT 'Expected Columns by Code:' as info;
SELECT unnest(ARRAY[
  'id',
  'task_id', 
  'user_id',
  'file_name',
  'file_url',
  'file_size',
  'file_type',
  'created_at',
  'updated_at'
]) as expected_column;
