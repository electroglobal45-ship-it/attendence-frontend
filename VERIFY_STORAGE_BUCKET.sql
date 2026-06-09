-- Verify the storage bucket and policies are set up correctly

-- 1. Check if bucket exists
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'task-attachments';

-- 2. Check storage policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%task%';

-- 3. Check if bucket is actually public
SELECT 
  id,
  name,
  CASE 
    WHEN public = true THEN '✓ PUBLIC (URLs will work)'
    ELSE '✗ PRIVATE (URLs might fail)'
  END AS access_status
FROM storage.buckets 
WHERE id = 'task-attachments';
