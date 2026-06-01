-- ============================================================================
-- FIX TASKS TABLE - Remove Project Dependencies
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check current constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.tasks'::regclass
AND conname LIKE '%project%' OR conname LIKE '%list%';

-- Step 2: Drop foreign key constraints
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_project_id_fkey CASCADE;

ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_list_id_fkey CASCADE;

ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS fk_tasks_project CASCADE;

ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS fk_tasks_list CASCADE;

-- Step 3: Make columns nullable
ALTER TABLE public.tasks 
ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.tasks 
ALTER COLUMN list_id DROP NOT NULL;

-- Step 4: Set default to NULL
ALTER TABLE public.tasks 
ALTER COLUMN project_id SET DEFAULT NULL;

ALTER TABLE public.tasks 
ALTER COLUMN list_id SET DEFAULT NULL;

-- Step 5: Verify changes
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('project_id', 'list_id');

-- Step 6: Test creating a task without project/list
INSERT INTO public.tasks (
    title,
    description,
    assigned_to,
    created_by,
    priority,
    status,
    position,
    project_id,
    list_id
) VALUES (
    'Test Task',
    'This is a test task without project',
    (SELECT id FROM auth.users WHERE role = 'employee' LIMIT 1),
    (SELECT id FROM auth.users WHERE role = 'admin' LIMIT 1),
    'medium',
    'todo',
    0,
    NULL,
    NULL
) RETURNING id, title, project_id, list_id;

-- Step 7: Clean up test task
DELETE FROM public.tasks WHERE title = 'Test Task' AND project_id IS NULL;

-- Success message
SELECT 
    '✓ Tasks table fixed!' AS status,
    'project_id and list_id are now nullable' AS details,
    NOW() AS completed_at;
