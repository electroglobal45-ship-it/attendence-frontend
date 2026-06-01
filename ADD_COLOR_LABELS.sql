-- Add color label column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS color_label VARCHAR(20) DEFAULT 'none';

-- Update existing tasks to have 'none' label
UPDATE public.tasks SET color_label = 'none' WHERE color_label IS NULL;

SELECT '✓ Color label column added to tasks!' as status;
