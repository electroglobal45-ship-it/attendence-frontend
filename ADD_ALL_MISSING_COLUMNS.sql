-- Add ALL missing columns to task_attachments table
-- Run this in Supabase SQL Editor

-- Add file_url column (MISSING NOW)
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add file_name column (might be missing)
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add file_type column (we added this before)
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Add file_size column (we added this before)
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Add user_id column (we added this before)
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add task_id column (should already exist)
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS task_id UUID;

-- Add timestamps if missing
ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.task_attachments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- Foreign key for user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_attachments_user_id_fkey'
  ) THEN
    ALTER TABLE public.task_attachments 
    ADD CONSTRAINT task_attachments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- Foreign key for task_id (if tasks table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'task_attachments_task_id_fkey'
    ) THEN
      ALTER TABLE public.task_attachments 
      ADD CONSTRAINT task_attachments_task_id_fkey 
      FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON public.task_attachments(user_id);

-- Verify all columns now exist
SELECT 
  'Column Check Complete' AS status,
  (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'file_url'
  )) AS file_url_exists,
  (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'file_name'
  )) AS file_name_exists,
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
    AND column_name = 'file_size'
  )) AS file_size_exists,
  (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'task_attachments' 
    AND column_name = 'user_id'
  )) AS user_id_exists;
