-- ============================================================================
-- TRELLO ENHANCEMENTS - DATABASE MIGRATION
-- ============================================================================
-- This adds missing features for full Trello functionality:
-- 1. Checklists (sub-tasks within cards)
-- 2. Card covers (color/image headers)
-- 3. Start dates (in addition to due dates)
-- 4. Completion flags
-- 5. Board backgrounds
-- ============================================================================

-- ============================================================================
-- 1. TASK CHECKLISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT checklists_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT checklists_position_positive CHECK (position >= 0)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON public.task_checklists(task_id);

-- ============================================================================
-- 2. CHECKLIST ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id UUID REFERENCES public.task_checklists(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT checklist_items_content_not_empty CHECK (length(trim(content)) > 0),
    CONSTRAINT checklist_items_position_positive CHECK (position >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON public.checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_assigned ON public.checklist_items(assigned_to);

-- ============================================================================
-- 3. ADD COLUMNS TO TASKS TABLE (Card Covers, Dates, Completion)
-- ============================================================================

-- Card cover columns
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS cover_type VARCHAR(20) CHECK (cover_type IN ('color', 'image', 'none'));

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS cover_value TEXT;

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS cover_size VARCHAR(10) DEFAULT 'half' CHECK (cover_size IN ('half', 'full'));

-- Start date (in addition to due_date)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- Completion flag
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- ============================================================================
-- 4. ADD COLUMNS TO PROJECTS TABLE (Board Backgrounds, Favorites)
-- ============================================================================

-- Board background
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS background_type VARCHAR(20) DEFAULT 'color' CHECK (background_type IN ('color', 'gradient', 'image'));

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS background_value TEXT;

-- Favorite/starred boards
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- Checklists policies
CREATE POLICY "Users can view checklists in their projects" ON public.task_checklists
    FOR SELECT USING (
        task_id IN (
            SELECT t.id FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.status = 'active'
        )
    );

CREATE POLICY "Project members can manage checklists" ON public.task_checklists
    FOR ALL USING (
        task_id IN (
            SELECT t.id FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() 
            AND pm.role IN ('admin', 'member') 
            AND pm.status = 'active'
        )
    );

-- Checklist items policies
CREATE POLICY "Users can view checklist items in their projects" ON public.checklist_items
    FOR SELECT USING (
        checklist_id IN (
            SELECT tc.id FROM public.task_checklists tc
            JOIN public.tasks t ON tc.task_id = t.id
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.status = 'active'
        )
    );

CREATE POLICY "Project members can manage checklist items" ON public.checklist_items
    FOR ALL USING (
        checklist_id IN (
            SELECT tc.id FROM public.task_checklists tc
            JOIN public.tasks t ON tc.task_id = t.id
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() 
            AND pm.role IN ('admin', 'member') 
            AND pm.status = 'active'
        )
    );

-- ============================================================================
-- 6. TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE TRIGGER update_task_checklists_updated_at 
BEFORE UPDATE ON public.task_checklists
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at 
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get checklist progress
CREATE OR REPLACE FUNCTION get_checklist_progress(checklist_uuid UUID)
RETURNS TABLE(total_items INTEGER, completed_items INTEGER, progress_percentage INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_items,
        COUNT(*) FILTER (WHERE is_completed = true)::INTEGER as completed_items,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE is_completed = true)::NUMERIC / COUNT(*)::NUMERIC) * 100)::INTEGER
        END as progress_percentage
    FROM public.checklist_items
    WHERE checklist_id = checklist_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get task checklist summary
CREATE OR REPLACE FUNCTION get_task_checklist_summary(task_uuid UUID)
RETURNS TABLE(total_checklists INTEGER, total_items INTEGER, completed_items INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT tc.id)::INTEGER as total_checklists,
        COUNT(ci.id)::INTEGER as total_items,
        COUNT(ci.id) FILTER (WHERE ci.is_completed = true)::INTEGER as completed_items
    FROM public.task_checklists tc
    LEFT JOIN public.checklist_items ci ON tc.id = ci.checklist_id
    WHERE tc.task_id = task_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

DO $$
DECLARE
    checklist_table_exists BOOLEAN;
    items_table_exists BOOLEAN;
    cover_column_exists BOOLEAN;
    start_date_column_exists BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'task_checklists'
    ) INTO checklist_table_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'checklist_items'
    ) INTO items_table_exists;
    
    -- Check if columns exist
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'cover_type'
    ) INTO cover_column_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'start_date'
    ) INTO start_date_column_exists;
    
    -- Report results
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TRELLO DATABASE ENHANCEMENTS COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'task_checklists table: %', CASE WHEN checklist_table_exists THEN '✓ Created' ELSE '✗ Failed' END;
    RAISE NOTICE 'checklist_items table: %', CASE WHEN items_table_exists THEN '✓ Created' ELSE '✗ Failed' END;
    RAISE NOTICE 'tasks.cover_type column: %', CASE WHEN cover_column_exists THEN '✓ Added' ELSE '✗ Failed' END;
    RAISE NOTICE 'tasks.start_date column: %', CASE WHEN start_date_column_exists THEN '✓ Added' ELSE '✗ Failed' END;
    RAISE NOTICE '============================================';
    
    IF checklist_table_exists AND items_table_exists AND cover_column_exists AND start_date_column_exists THEN
        RAISE NOTICE '✓ All enhancements applied successfully!';
    ELSE
        RAISE WARNING '⚠ Some enhancements may have failed. Check logs above.';
    END IF;
    
    RAISE NOTICE '============================================';
END $$;

-- Final success message
SELECT 
    '✓ Trello database enhancements completed!' AS status,
    '2 new tables, 8 new columns, RLS policies enabled' AS details,
    NOW() AS completed_at;
