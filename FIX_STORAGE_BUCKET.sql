-- Fix storage bucket configuration for task-attachments
-- This ensures the bucket is properly set up with correct permissions

-- 1. Delete existing bucket if it has issues (BE CAREFUL - this deletes all files!)
-- Uncomment the next line ONLY if you want to start fresh
-- DELETE FROM storage.buckets WHERE id = 'task-attachments';

-- 2. Create or update the bucket to ensure it's public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments', 
  'task-attachments', 
  true,  -- Make it public so URLs work
  52428800,  -- 50MB limit
  NULL  -- Allow all file types
)
ON CONFLICT (id) 
DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = NULL;

-- 3. Remove all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;

-- 4. Create simple, working policies
-- Policy for INSERT (upload)
CREATE POLICY "task_attachments_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

-- Policy for SELECT (download/view)
CREATE POLICY "task_attachments_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'task-attachments');

-- Policy for DELETE
CREATE POLICY "task_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');

-- Policy for UPDATE
CREATE POLICY "task_attachments_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'task-attachments');

-- 5. Verify everything
SELECT 
  '✅ STORAGE BUCKET CONFIGURED' AS status,
  (SELECT public FROM storage.buckets WHERE id = 'task-attachments') AS is_public,
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'task-attachments') AS size_limit,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'task_attachments%') AS policy_count;
