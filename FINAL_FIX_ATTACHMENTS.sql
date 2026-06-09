-- FINAL FIX for task attachments
-- Run this in Supabase SQL Editor

-- 1. Add the missing file_type column (THIS IS THE CRITICAL FIX!)
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 2. Add the missing user_id column
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Add foreign key constraint for user_id (do this separately to avoid errors)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_attachments_user_id_fkey'
  ) THEN
    ALTER TABLE public.task_attachments 
    ADD CONSTRAINT task_attachments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Create index on user_id
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON public.task_attachments(user_id);

-- 5. Recreate the storage bucket for task-attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Create storage policies
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload task attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
CREATE POLICY "Anyone can view task attachments" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Authenticated users can delete task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete task attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Authenticated users can update task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can update task attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'task-attachments');

-- 7. Verify the fix
SELECT 
  'TASK ATTACHMENTS FIX COMPLETE ✓' AS status,
  (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'file_type'
  )) AS file_type_exists,
  (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'user_id'
  )) AS user_id_exists,
  (SELECT EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'task-attachments'
  )) AS bucket_exists;
