-- Migration to fix task_attachments table and add missing columns
-- Run this in your Supabase SQL Editor

-- First, let's check what columns exist (this is just informational)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'task_attachments'
-- ORDER BY ordinal_position;

-- Add file_type column if missing (THIS IS THE CRITICAL FIX)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'file_type'
  ) THEN
    ALTER TABLE public.task_attachments ADD COLUMN file_type TEXT;
    RAISE NOTICE 'Added file_type column to task_attachments';
  ELSE
    RAISE NOTICE 'file_type column already exists';
  END IF;
END $$;

-- Add file_size column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'file_size'
  ) THEN
    ALTER TABLE public.task_attachments ADD COLUMN file_size INTEGER;
    RAISE NOTICE 'Added file_size column to task_attachments';
  ELSE
    RAISE NOTICE 'file_size column already exists';
  END IF;
END $$;

-- Add user_id column if missing (in case it's not there)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.task_attachments ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_id column to task_attachments';
  ELSE
    RAISE NOTICE 'user_id column already exists';
  END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);

-- Only create user_id index if the column exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON public.task_attachments(user_id);
    RAISE NOTICE 'Created index on user_id';
  END IF;
END $$;

-- Add updated_at trigger only if the function exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS set_task_attachments_updated_at ON public.task_attachments;
    CREATE TRIGGER set_task_attachments_updated_at
      BEFORE UPDATE ON public.task_attachments
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    RAISE NOTICE 'Created updated_at trigger';
  END IF;
END $$;

-- Disable RLS (matching your project's security model)
ALTER TABLE public.task_attachments DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO anon, authenticated;

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for task-attachments bucket
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

-- Verify the fix
SELECT 
  'Task attachments migration complete' AS status,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'file_type'
  ) AS file_type_column_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'file_size'
  ) AS file_size_column_exists,
  EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'task-attachments'
  ) AS bucket_exists;
