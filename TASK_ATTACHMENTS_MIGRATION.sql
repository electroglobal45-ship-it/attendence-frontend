-- ============================================================================
-- TASK ATTACHMENTS AND COMMENTS MIGRATION
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- DROP AND RECREATE BOTH TABLES TO ENSURE CLEAN STRUCTURE
DROP TABLE IF EXISTS public.task_attachments CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;

-- ============================================================================
-- Task Attachments Table
-- ============================================================================
CREATE TABLE public.task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT task_attachments_file_name_not_empty CHECK (length(trim(file_name)) > 0)
);

CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX idx_task_attachments_user ON public.task_attachments(user_id);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments on their tasks" ON public.task_attachments
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM public.tasks 
            WHERE assigned_to = auth.uid() OR created_by = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can add attachments to their tasks" ON public.task_attachments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND (
            task_id IN (
                SELECT id FROM public.tasks 
                WHERE assigned_to = auth.uid() OR created_by = auth.uid()
            )
            OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        )
    );

CREATE POLICY "Users can delete their own attachments" ON public.task_attachments
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- Task Comments Table (using 'comment' column name to match API)
-- ============================================================================
CREATE TABLE public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comment TEXT NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT task_comments_comment_not_empty CHECK (length(trim(comment)) > 0)
);

CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user ON public.task_comments(user_id);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Users can view comments on their tasks" ON public.task_comments
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM public.tasks 
            WHERE assigned_to = auth.uid() OR created_by = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can add comments to their tasks" ON public.task_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND (
            task_id IN (
                SELECT id FROM public.tasks 
                WHERE assigned_to = auth.uid() OR created_by = auth.uid()
            )
            OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        )
    );

CREATE POLICY "System can insert comments" ON public.task_comments
    FOR INSERT WITH CHECK (is_system = true);

-- Final success message
SELECT 
    '✓ Migration completed successfully!' AS status,
    'Both tables recreated with correct column names' AS message;
