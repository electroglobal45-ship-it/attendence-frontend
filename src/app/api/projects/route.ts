/**
 * GET  /api/projects  — list user's projects
 * POST /api/projects  — create a new project
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(req)

    // Get projects where user is a member or owner
    const { data: projects, error } = await supabaseServer
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
        project_members!inner(role, status),
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
      .eq('project_members.user_id', user.userId)
      .eq('project_members.status', 'active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    // Transform data to include member role and task counts
    const transformedProjects = projects?.map(project => ({
      ...project,
      member_role: project.project_members[0]?.role || 'viewer',
      lists_count: project.project_lists?.length || 0,
      tasks_count: project.tasks?.length || 0,
      tasks_by_status: {
        todo: project.tasks?.filter(t => t.status === 'todo').length || 0,
        in_progress: project.tasks?.filter(t => t.status === 'in_progress').length || 0,
        review: project.tasks?.filter(t => t.status === 'review').length || 0,
        done: project.tasks?.filter(t => t.status === 'done').length || 0,
      },
      // Remove nested data to keep response clean
      project_members: undefined,
      project_lists: undefined,
      tasks: undefined
    })) || []

    return NextResponse.json({ projects: transformedProjects })
  } catch (error: any) {
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(req)

    const body = await req.json()
    const { name, description, color } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    if (name.length > 255) {
      return NextResponse.json({ error: 'Project name must be less than 255 characters' }, { status: 400 })
    }

    // Create the project
    const { data: project, error: projectError } = await supabaseServer
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
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    // Add creator as project admin
    const { error: memberError } = await supabaseServer
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
      await supabaseServer.from('projects').delete().eq('id', project.id)
      return NextResponse.json({ error: 'Failed to set up project permissions' }, { status: 500 })
    }

    // Create default lists using the database function
    const { error: listsError } = await supabaseServer
      .rpc('create_default_project_lists', { project_uuid: project.id })

    if (listsError) {
      console.error('Error creating default lists:', listsError)
      // Don't fail the request, lists can be created manually
    }

    // Create default labels using the database function
    const { error: labelsError } = await supabaseServer
      .rpc('create_default_project_labels', { project_uuid: project.id })

    if (labelsError) {
      console.error('Error creating default labels:', labelsError)
      // Don't fail the request, labels can be created manually
    }

    // Create project settings
    const { error: settingsError } = await supabaseServer
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
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}