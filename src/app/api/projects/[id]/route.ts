/**
 * GET    /api/projects/[id]  — get project details
 * PUT    /api/projects/[id]  — update project
 * DELETE /api/projects/[id]  — delete project (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: { id: string }
}

async function getProjectWithPermissions(projectId: string, userId: string) {
  // Get project with user's membership info
  const { data: project, error } = await supabaseServer
    .from('projects')
    .select(`
      *,
      project_members!inner(role, status)
    `)
    .eq('id', projectId)
    .eq('project_members.user_id', userId)
    .eq('project_members.status', 'active')
    .eq('is_active', true)
    .single()

  if (error || !project) {
    return null
  }

  return {
    ...project,
    user_role: project.project_members[0]?.role || 'viewer'
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const projectId = params.id

    // Check if it's a public_id or UUID
    let project
    if (projectId.length === 12) {
      // It's a public_id
      const { data, error } = await supabaseServer
        .from('projects')
        .select(`
          *,
          project_members!inner(role, status),
          project_lists(
            id,
            public_id,
            name,
            position,
            color,
            created_at,
            updated_at
          ),
          tasks(
            id,
            public_id,
            title,
            description,
            list_id,
            assigned_to,
            created_by,
            position,
            due_date,
            priority,
            status,
            completion_percentage,
            created_at,
            updated_at,
            completed_at
          ),
          task_labels(
            id,
            name,
            color,
            created_at
          ),
          project_members(
            id,
            user_id,
            role,
            status,
            added_at,
            users(name, email)
          )
        `)
        .eq('public_id', projectId)
        .eq('project_members.user_id', user.userId)
        .eq('project_members.status', 'active')
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }

      project = data
    } else {
      // It's a UUID
      const projectData = await getProjectWithPermissions(projectId, user.userId)
      if (!projectData) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }

      // Get full project details
      const { data, error } = await supabaseServer
        .from('projects')
        .select(`
          *,
          project_lists(
            id,
            public_id,
            name,
            position,
            color,
            created_at,
            updated_at
          ),
          tasks(
            id,
            public_id,
            title,
            description,
            list_id,
            assigned_to,
            created_by,
            position,
            due_date,
            priority,
            status,
            completion_percentage,
            created_at,
            updated_at,
            completed_at
          ),
          task_labels(
            id,
            name,
            color,
            created_at
          ),
          project_members(
            id,
            user_id,
            role,
            status,
            added_at,
            users(name, email)
          )
        `)
        .eq('id', projectId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      project = { ...data, user_role: projectData.user_role }
    }

    // Sort lists by position
    if (project.project_lists) {
      project.project_lists.sort((a: any, b: any) => a.position - b.position)
    }

    // Sort tasks by position within each list
    if (project.tasks) {
      project.tasks.sort((a: any, b: any) => a.position - b.position)
    }

    // Add task statistics
    const taskStats = {
      total: project.tasks?.length || 0,
      by_status: {
        todo: project.tasks?.filter((t: any) => t.status === 'todo').length || 0,
        in_progress: project.tasks?.filter((t: any) => t.status === 'in_progress').length || 0,
        review: project.tasks?.filter((t: any) => t.status === 'review').length || 0,
        done: project.tasks?.filter((t: any) => t.status === 'done').length || 0,
      },
      by_priority: {
        low: project.tasks?.filter((t: any) => t.priority === 'low').length || 0,
        medium: project.tasks?.filter((t: any) => t.priority === 'medium').length || 0,
        high: project.tasks?.filter((t: any) => t.priority === 'high').length || 0,
        urgent: project.tasks?.filter((t: any) => t.priority === 'urgent').length || 0,
      }
    }

    return NextResponse.json({ 
      project: {
        ...project,
        task_stats: taskStats
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/projects/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const projectId = params.id

    // Verify user has admin access to this project
    const project = await getProjectWithPermissions(projectId, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    if (project.user_role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to update project' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, color, is_archived } = body

    // Validate input
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: 'Project name cannot be empty' }, { status: 400 })
      }
      if (name.length > 255) {
        return NextResponse.json({ error: 'Project name must be less than 255 characters' }, { status: 400 })
      }
    }

    // Update project
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (color !== undefined) updateData.color = color
    if (is_archived !== undefined) updateData.is_archived = is_archived

    const { data: updatedProject, error } = await supabaseServer
      .from('projects')
      .update(updateData)
      .eq('id', project.id)
      .select('id, public_id, name, description, color, is_archived, updated_at')
      .single()

    if (error) {
      console.error('Error updating project:', error)
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      project: updatedProject 
    })

  } catch (error: any) {
    console.error('Error in PUT /api/projects/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const projectId = params.id

    // Verify user has admin access to this project
    const project = await getProjectWithPermissions(projectId, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    if (project.user_role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to delete project' }, { status: 403 })
    }

    // Soft delete the project
    const { error } = await supabaseServer
      .from('projects')
      .update({ 
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', project.id)

    if (error) {
      console.error('Error deleting project:', error)
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error in DELETE /api/projects/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}