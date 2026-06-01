/**
 * GET  /api/projects  — list user's projects
 * POST /api/projects  — create a new project
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { requireAuthenticatedClient } from '@/lib/supabase-user-client'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(req)
    
    // Get user-authenticated Supabase client (respects RLS)
    const supabase = requireAuthenticatedClient(req)

    // For admin users, show all active projects
    // For regular users, show only projects they're members of
    let query = supabase
      .from('projects')
      .select(`
        id,
        public_id,
        name,
        description,
        color,
        created_at,
        updated_at,
        is_active,
        is_archived,
        workspace_owner_id,
        created_by,
        project_lists(id, name, position),
        tasks(
          id,
          title,
          status,
          priority,
          assigned_to,
          due_date
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const { data: projects, error } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects', details: error.message }, { status: 500 })
    }

    // Transform data to include task counts
    const transformedProjects = projects?.map(project => ({
      ...project,
      member_role: 'admin', // Simplified - all users can manage boards
      lists_count: project.project_lists?.length || 0,
      tasks_count: project.tasks?.length || 0,
      tasks_by_status: {
        todo: project.tasks?.filter(t => t.status === 'todo').length || 0,
        in_progress: project.tasks?.filter(t => t.status === 'in_progress').length || 0,
        review: project.tasks?.filter(t => t.status === 'review').length || 0,
        done: project.tasks?.filter(t => t.status === 'done').length || 0,
      },
      // Remove nested data to keep response clean
      project_lists: undefined,
      tasks: undefined
    })) || []

    return NextResponse.json({ projects: transformedProjects })
  } catch (error: any) {
    console.error('Error in GET /api/projects:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(req)
    
    // Get user-authenticated Supabase client (respects RLS)
    const supabase = requireAuthenticatedClient(req)

    const body = await req.json()
    const { name, description, color } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    if (name.length > 255) {
      return NextResponse.json({ error: 'Project name must be less than 255 characters' }, { status: 400 })
    }

    // Create the project using user-authenticated client
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3B82F6',
        workspace_owner_id: user.role === 'admin' ? user.userId : null,
        created_by: user.userId,
        is_active: true,
        is_archived: false
      })
      .select('id, public_id, name, description, color, created_at')
      .single()

    if (projectError) {
      console.error('Error creating project:', projectError)
      return NextResponse.json({ 
        error: 'Failed to create project', 
        details: projectError.message 
      }, { status: 500 })
    }

    // Add creator as project admin using user-authenticated client
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.userId,
        role: 'admin',
        added_by: user.userId,
        status: 'active'
      })

    if (memberError) {
      console.error('Error adding project member:', memberError)
      // Try to clean up the project if member creation fails
      await supabase.from('projects').delete().eq('id', project.id)
      return NextResponse.json({ 
        error: 'Failed to set up project permissions',
        details: memberError.message
      }, { status: 500 })
    }

    // Create default lists - use service role for database functions
    const { error: listsError } = await supabaseServer
      .rpc('create_default_project_lists', { project_uuid: project.id })

    if (listsError) {
      console.error('Error creating default lists:', listsError)
      
      // If function doesn't exist, create lists manually using user client
      if (listsError.message?.includes('function') || listsError.message?.includes('does not exist')) {
        console.log('Creating lists manually...')
        const defaultLists = [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Review', position: 2 },
          { name: 'Done', position: 3 }
        ]
        
        for (const list of defaultLists) {
          await supabase
            .from('project_lists')
            .insert({
              project_id: project.id,
              name: list.name,
              position: list.position,
              created_by: user.userId
            })
        }
      }
    }

    // Create default labels - use service role for database functions
    const { error: labelsError } = await supabaseServer
      .rpc('create_default_project_labels', { project_uuid: project.id })

    if (labelsError) {
      console.error('Error creating default labels:', labelsError)
      
      // If function doesn't exist, create labels manually using user client
      if (labelsError.message?.includes('function') || labelsError.message?.includes('does not exist')) {
        console.log('Creating labels manually...')
        const defaultLabels = [
          { name: 'Bug', color: '#EF4444' },
          { name: 'Feature', color: '#3B82F6' },
          { name: 'Enhancement', color: '#8B5CF6' },
          { name: 'Documentation', color: '#10B981' },
          { name: 'Urgent', color: '#F59E0B' }
        ]
        
        for (const label of defaultLabels) {
          await supabase
            .from('task_labels')
            .insert({
              project_id: project.id,
              name: label.name,
              color: label.color,
              created_by: user.userId
            })
        }
      }
    }

    // Create project settings using user client
    const { error: settingsError } = await supabase
      .from('project_settings')
      .insert({
        project_id: project.id,
        auto_assign_creator: true,
        notify_on_task_creation: true,
        notify_on_task_assignment: true,
        notify_on_due_date: true,
        integrate_with_attendance: false
      })

    if (settingsError) {
      console.error('Error creating project settings:', settingsError)
      // Don't fail the request, settings can be configured later
    }

    return NextResponse.json({ 
      success: true, 
      project: {
        ...project,
        member_role: 'admin',
        lists_count: 4, // Default lists created
        tasks_count: 0,
        tasks_by_status: { todo: 0, in_progress: 0, review: 0, done: 0 }
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/projects:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status })
  }
}