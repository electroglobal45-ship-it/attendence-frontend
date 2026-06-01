-- ============================================================================
-- RUN THIS FIRST - Make Tasks Work Without Projects
-- ============================================================================
-- Copy and paste this entire script into Supabase SQL Editor and click RUN
-- ============================================================================

-- 1. Drop ALL foreign key constraints on tasks table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.tasks'::regclass
        AND contype = 'f'
    ) LOOP
        EXECUTE 'ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
    END LOOP;
END $$;

-- 2. Make project_id and list_id nullable
ALTER TABLE public.tasks ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN list_id DROP NOT NULL;

-- 3. Set defaults to NULL
ALTER TABLE public.tasks ALTER COLUMN project_id SET DEFAULT NULL;
ALTER TABLE public.tasks ALTER COLUMN list_id SET DEFAULT NULL;

-- 4. Update RLS policies to allow tasks without projects
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.tasks;
CREATE POLICY "Users can view their assigned tasks" ON public.tasks
    FOR SELECT USING (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
CREATE POLICY "Admins can create tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;
CREATE POLICY "Users can update their assigned tasks" ON public.tasks
    FOR UPDATE USING (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. Verify the changes
DO $$
DECLARE
    project_nullable TEXT;
    list_nullable TEXT;
BEGIN
    SELECT is_nullable INTO project_nullable
    FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'project_id';
    
    SELECT is_nullable INTO list_nullable
    FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'list_id';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'project_id nullable: %', project_nullable;
    RAISE NOTICE 'list_id nullable: %', list_nullable;
    RAISE NOTICE '========================================';
    
    IF project_nullable = 'YES' AND list_nullable = 'YES' THEN
        RAISE NOTICE '✓ SUCCESS! Tasks can now be created without projects';
    ELSE
        RAISE WARNING '✗ FAILED! Columns are still NOT NULL';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- 6. Test insert (will be rolled back)
DO $$
DECLARE
    test_admin_id UUID;
    test_employee_id UUID;
    test_task_id UUID;
BEGIN
    -- Get admin and employee IDs
    SELECT id INTO test_admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO test_employee_id FROM public.users WHERE role = 'employee' LIMIT 1;
    
    IF test_admin_id IS NULL THEN
        RAISE WARNING 'No admin user found for testing';
        RETURN;
    END IF;
    
    IF test_employee_id IS NULL THEN
        RAISE WARNING 'No employee user found for testing';
        RETURN;
    END IF;
    
    -- Try to insert a test task
    BEGIN
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
            'TEST TASK - WILL BE DELETED',
            'Testing task creation without project',
            test_employee_id,
            test_admin_id,
            'medium',
            'todo',
            0,
            NULL,
            NULL
        ) RETURNING id INTO test_task_id;
        
        RAISE NOTICE '✓ Test task created successfully with ID: %', test_task_id;
        
        -- Delete the test task
        DELETE FROM public.tasks WHERE id = test_task_id;
        RAISE NOTICE '✓ Test task deleted';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '✗ Test task creation failed: %', SQLERRM;
    END;
END $$;

-- Final message
SELECT 
    '✓ Migration complete!' AS status,
    'You can now create tasks without projects' AS message,
    NOW() AS timestamp;
