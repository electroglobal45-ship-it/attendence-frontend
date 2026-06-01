-- ============================================================================
-- SIMPLE TASK SYSTEM MIGRATION
-- ============================================================================
-- This makes tasks independent of projects/boards
-- Tasks are directly assigned to employees without needing boards/lists
-- ============================================================================

-- 1. Drop foreign key constraints on project_id and list_id if they exist
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_list_id_fkey;

-- 2. Make project_id and list_id nullable in tasks table
ALTER TABLE public.tasks 
ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.tasks 
ALTER COLUMN list_id DROP NOT NULL;

-- 3. Set default values to NULL
ALTER TABLE public.tasks 
ALTER COLUMN project_id SET DEFAULT NULL;

ALTER TABLE public.tasks 
ALTER COLUMN list_id SET DEFAULT NULL;

-- 2. Ensure task_comments table exists
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comment TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT task_comments_comment_not_empty CHECK (length(trim(comment)) > 0)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON public.task_comments(user_id);

-- 3. Enable RLS on task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for task_comments
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON public.task_comments;
CREATE POLICY "Users can view comments on their tasks" ON public.task_comments
    FOR SELECT USING (
        auth.uid() IN (
            SELECT assigned_to FROM public.tasks WHERE id = task_id
            UNION
            SELECT created_by FROM public.tasks WHERE id = task_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can add comments to their tasks" ON public.task_comments;
CREATE POLICY "Users can add comments to their tasks" ON public.task_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND (
            auth.uid() IN (
                SELECT assigned_to FROM public.tasks WHERE id = task_id
                UNION
                SELECT created_by FROM public.tasks WHERE id = task_id
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- 5. Update RLS policies for tasks to work without projects
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.tasks;
CREATE POLICY "Users can view their assigned tasks" ON public.tasks
    FOR SELECT USING (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
CREATE POLICY "Admins can create tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;
CREATE POLICY "Users can update their assigned tasks" ON public.tasks
    FOR UPDATE USING (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins can delete tasks" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. Add trigger for task_comments updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Verification
DO $$
DECLARE
    comments_table_exists BOOLEAN;
    project_id_nullable BOOLEAN;
BEGIN
    -- Check if task_comments table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'task_comments'
    ) INTO comments_table_exists;
    
    -- Check if project_id is nullable
    SELECT is_nullable = 'YES' INTO project_id_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks' 
    AND column_name = 'project_id';
    
    -- Report results
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SIMPLE TASK SYSTEM MIGRATION COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'task_comments table: %', CASE WHEN comments_table_exists THEN '✓ Created' ELSE '✗ Failed' END;
    RAISE NOTICE 'project_id nullable: %', CASE WHEN project_id_nullable THEN '✓ Yes' ELSE '✗ No' END;
    RAISE NOTICE '============================================';
    
    IF comments_table_exists AND project_id_nullable THEN
        RAISE NOTICE '✓ All changes applied successfully!';
        RAISE NOTICE 'Tasks can now be created without projects/boards';
    ELSE
        RAISE WARNING '⚠ Some changes may have failed. Check logs above.';
    END IF;
    
    RAISE NOTICE '============================================';
END $$;

-- Success message
SELECT 
    '✓ Simple task system migration completed!' AS status,
    'Tasks are now independent of projects/boards' AS details,
    NOW() AS completed_at;
