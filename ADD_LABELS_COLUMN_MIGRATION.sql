-- Migration to add labels column to tasks table
-- Run this in your Supabase SQL Editor

-- Add labels column to tasks table (JSONB type to store array of label objects)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb;

-- Add an index for faster label queries
CREATE INDEX IF NOT EXISTS idx_tasks_labels ON public.tasks USING gin (labels);

-- Add a comment to document the column
COMMENT ON COLUMN public.tasks.labels IS 'Array of label objects: [{"id": "priority"}, {"id": "in-process"}]';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'labels';
