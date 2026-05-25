-- ============================================================================
-- KAN PROJECT MANAGEMENT INTEGRATION - SUPABASE MIGRATION
-- ============================================================================
-- This script adds project management functionality to your existing attendance system
-- Adapted from Kan's architecture to work with Supabase
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROJECTS TABLE (equivalent to Kan's boards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    public_id VARCHAR(12) UNIQUE NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- hex color for project theme
    
    -- Workspace/Organization (using existing user as workspace owner)
    workspace_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Creator
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    
    -- Settings
    allow_comments BOOLEAN DEFAULT true,
    allow_attachments BOOLEAN DEFAULT true,
    
    CONSTRAINT projects_name_not_empty CHECK (length(trim(name)) > 0)
);

-- ============================================================================
-- 2. PROJECT LISTS TABLE (Kanban columns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    public_id VARCHAR(12) UNIQUE NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    name VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Ordering
    position INTEGER NOT NULL DEFAULT 0,
    
    -- Styling
    color VARCHAR(7) DEFAULT '#6B7280',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT lists_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT lists_position_positive CHECK (position >= 0)
);

-- ============================================================================
-- 3. TASKS TABLE (equivalent to Kan's cards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    public_id VARCHAR(12) UNIQUE NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Relationships
    list_id UUID REFERENCES public.project_lists(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ordering
    position INTEGER NOT NULL DEFAULT 0,
    
    -- Task Properties
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    
    -- Progress
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT tasks_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT tasks_position_positive CHECK (position >= 0)
);

-- ============================================================================
-- 4. TASK LABELS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_labels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- hex color
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT labels_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT labels_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    UNIQUE(project_id, name) -- Unique label names per project
);

-- ============================================================================
-- 5. TASK LABEL ASSIGNMENTS TABLE (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_label_assignments (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    label_id UUID REFERENCES public.task_labels(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (task_id, label_id)
);

-- ============================================================================
-- 6. TASK COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT comments_content_not_empty CHECK (length(trim(content)) > 0)
);

-- ============================================================================
-- 7. TASK ATTACHMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    
    -- File information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Supabase storage path
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Upload information
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT attachments_filename_not_empty CHECK (length(trim(file_name)) > 0),
    CONSTRAINT attachments_filepath_not_empty CHECK (length(trim(file_path)) > 0),
    CONSTRAINT attachments_filesize_positive CHECK (file_size IS NULL OR file_size > 0)
);

-- ============================================================================
-- 8. PROJECT MEMBERS TABLE (who can access projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role-based access
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    
    -- Invitation tracking
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    
    UNIQUE(project_id, user_id) -- One membership per user per project
);

-- ============================================================================
-- 9. TASK ACTIVITY LOG TABLE (for tracking changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Activity details
    action VARCHAR(50) NOT NULL, -- created, updated, moved, assigned, commented, etc.
    description TEXT,
    
    -- Change tracking (JSON for flexibility)
    old_values JSONB,
    new_values JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT activities_action_not_empty CHECK (length(trim(action)) > 0)
);

-- ============================================================================
-- 10. PROJECT SETTINGS TABLE (project-specific configurations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    
    -- Workflow settings
    default_list_id UUID REFERENCES public.project_lists(id) ON DELETE SET NULL,
    auto_assign_creator BOOLEAN DEFAULT false,
    
    -- Notification settings
    notify_on_task_creation BOOLEAN DEFAULT true,
    notify_on_task_assignment BOOLEAN DEFAULT true,
    notify_on_due_date BOOLEAN DEFAULT true,
    
    -- Integration settings
    integrate_with_attendance BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_workspace_owner ON public.projects(workspace_owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_active ON public.projects(is_active) WHERE is_active = true;

-- Project lists indexes
CREATE INDEX IF NOT EXISTS idx_project_lists_project ON public.project_lists(project_id);
CREATE INDEX IF NOT EXISTS idx_project_lists_position ON public.project_lists(project_id, position);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_list ON public.tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(list_id, position);

-- Task labels indexes
CREATE INDEX IF NOT EXISTS idx_task_labels_project ON public.task_labels(project_id);

-- Task comments indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON public.task_comments(user_id);

-- Task attachments indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);

-- Project members indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_active ON public.project_members(user_id, status) WHERE status = 'active';

-- Task activities indexes
CREATE INDEX IF NOT EXISTS idx_task_activities_task ON public.task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_user ON public.task_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON public.task_activities(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view projects they are members of" ON public.projects
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = projects.id AND status = 'active'
        )
        OR workspace_owner_id = auth.uid()
    );

CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project admins can update projects" ON public.projects
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = projects.id AND role = 'admin' AND status = 'active'
        )
        OR workspace_owner_id = auth.uid()
    );

CREATE POLICY "Project admins can delete projects" ON public.projects
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = projects.id AND role = 'admin' AND status = 'active'
        )
        OR workspace_owner_id = auth.uid()
    );

-- Project lists policies
CREATE POLICY "Users can view lists in their projects" ON public.project_lists
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.status = 'active'
        )
    );

CREATE POLICY "Project members can manage lists" ON public.project_lists
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.role IN ('admin', 'member') AND pm.status = 'active'
        )
    );

-- Tasks policies
CREATE POLICY "Users can view tasks in their projects" ON public.tasks
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.status = 'active'
        )
    );

CREATE POLICY "Project members can manage tasks" ON public.tasks
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.role IN ('admin', 'member') AND pm.status = 'active'
        )
    );

-- Task comments policies
CREATE POLICY "Users can view comments in their projects" ON public.task_comments
    FOR SELECT USING (
        task_id IN (
            SELECT t.id FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.status = 'active'
        )
    );

CREATE POLICY "Users can create comments in their projects" ON public.task_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        task_id IN (
            SELECT t.id FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.status = 'active'
        )
    );

-- Project members policies
CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.status = 'active'
        )
    );

CREATE POLICY "Project admins can manage members" ON public.project_members
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = auth.uid() AND pm.role = 'admin' AND pm.status = 'active'
        )
    );

-- ============================================================================
-- STORAGE BUCKET FOR TASK ATTACHMENTS
-- ============================================================================

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'task-attachments',
    'task-attachments',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for task attachments
CREATE POLICY "Users can view attachments in their projects" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'task-attachments' AND
        auth.uid() IN (
            SELECT pm.user_id FROM public.task_attachments ta
            JOIN public.tasks t ON ta.task_id = t.id
            JOIN public.projects p ON t.project_id = p.id
            JOIN public.project_members pm ON p.id = pm.project_id
            WHERE ta.file_path = name AND pm.status = 'active'
        )
    );

CREATE POLICY "Users can upload attachments to their projects" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'task-attachments' AND
        auth.uid() IS NOT NULL
    );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to generate unique public IDs
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_lists_updated_at BEFORE UPDATE ON public.project_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_settings_updated_at BEFORE UPDATE ON public.project_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT DATA SETUP
-- ============================================================================

-- Function to create default project lists
CREATE OR REPLACE FUNCTION create_default_project_lists(project_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.project_lists (name, project_id, position) VALUES
    ('To Do', project_uuid, 0),
    ('In Progress', project_uuid, 1),
    ('Review', project_uuid, 2),
    ('Done', project_uuid, 3);
END;
$$ LANGUAGE plpgsql;

-- Function to create default project labels
CREATE OR REPLACE FUNCTION create_default_project_labels(project_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.task_labels (name, color, project_id) VALUES
    ('Bug', '#EF4444', project_uuid),
    ('Feature', '#10B981', project_uuid),
    ('Enhancement', '#3B82F6', project_uuid),
    ('Documentation', '#8B5CF6', project_uuid),
    ('Urgent', '#F59E0B', project_uuid);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION AND COMPLETION
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'projects', 'project_lists', 'tasks', 'task_labels', 'task_label_assignments',
          'task_comments', 'task_attachments', 'project_members', 'task_activities', 'project_settings'
      );

    RAISE NOTICE '============================================';
    RAISE NOTICE 'KAN PROJECT MANAGEMENT MIGRATION COMPLETE!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Storage bucket: task-attachments';
    RAISE NOTICE 'RLS policies: Enabled';
    RAISE NOTICE 'Indexes: Created for performance';
    RAISE NOTICE 'Triggers: Auto-update timestamps';
    RAISE NOTICE '============================================';
    
    IF table_count = 10 THEN
        RAISE NOTICE '✓ All project management tables created successfully!';
    ELSE
        RAISE WARNING '⚠ Expected 10 tables, found %', table_count;
    END IF;
    
    RAISE NOTICE '============================================';
END $$;

-- Final success message
SELECT 
    '✓ Kan Project Management Integration completed successfully!' AS status,
    '10 tables created with RLS policies and indexes' AS details,
    NOW() AS completed_at;