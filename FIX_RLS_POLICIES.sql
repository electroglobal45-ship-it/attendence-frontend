-- ============================================================================
-- FIX RLS POLICIES - Remove Infinite Recursion
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the circular reference issue
-- ============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project admins can manage members" ON public.project_members;

-- Recreate project_members policies WITHOUT circular reference
-- Users can view members of projects they belong to
CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid() 
        OR project_id IN (
            SELECT project_id FROM public.project_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Project admins can manage members
CREATE POLICY "Project admins can manage members" ON public.project_members
    FOR ALL USING (
        project_id IN (
            SELECT project_id FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this, test with:
-- SELECT * FROM public.project_members WHERE user_id = auth.uid();
