/**
 * GET    /api/lists/[id]  — get list details
 * PUT    /api/lists/[id]  — update list
 * DELETE /api/lists/[id]  — delete list
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

async function getListWithPermissions(listId: string, userId: string) {
  const { data: list, error } = await supabaseServer
    .from('project_lists')
    .select(`
      *,
      projects!inner(
        id,
        project_members!inner(role, status)
      )
    `)
    .eq('id', listId)
    .eq('projects.project_members.user_id', userId)
    .eq('projects.project_members.status', 'active')
    .single()

  if (error || !list) {
    return null
  }

  // When using !inner, projects becomes an array, so we need to access the first element
  const projects = list.projects as any
  const projectMembers = Array.isArray(projects) 
    ? projects[0]?.project_members 
    : projects?.project_members

  return {
    ...list,
    user_role: Array.isArray(projectMembers) 
      ? projectMembers[0]?.role || 'viewer'
      : projectMembers?.role || 'viewer'
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const listId = params.id

    // Get list with permissions
    const list = await getListWithPermissions(listId, user.userId)
    if (!list) {
      return NextResponse.json({ error: 'List not found or access denied' }, { status: 404 })
    }

    // Get tasks in this list
    const { data: tasks, error: tasksError } = await supabaseServer
      .from('tasks')
      .select(`
        id,
        public_id,
        title,
        description,
        assigned_to,
        position,
        due_date,
        priority,
        status,
        completion_percentage,
        created_at,
        assigned_user:users!tasks_assigned_to_fkey(id, name, email)
      `)
      .eq('list_id', listId)
      .order('position', { ascending: true })

    if (tasksError) {
      console.error('Error fetching list tasks:', tasksError)
    }

    return NextResponse.json({ 
      list: {
        id: list.id,
        public_id: list.public_id,
        name: list.name,
        position: list.position,
        color: list.color,
        project_id: list.project_id,
        created_at: list.created_at,
        updated_at: list.updated_at,
        user_role: list.user_role,
        tasks: tasks || [],
        task_count: tasks?.length || 0
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/lists/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const listId = params.id

    // Get list with permissions
    const list = await getListWithPermissions(listId, user.userId)
    if (!list) {
      return NextResponse.json({ error: 'List not found or access denied' }, { status: 404 })
    }

    // Members and admins can edit lists
    if (list.user_role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions to edit list' }, { status: 403 })
    }

    const body = await req.json()
    const { name, color, position } = body

    // Validate input
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: 'List name cannot be empty' }, { status: 400 })
      }
      if (name.length > 255) {
        return NextResponse.json({ error: 'List name must be less than 255 characters' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (color !== undefined) updateData.color = color
    if (position !== undefined) updateData.position = position

    // Update the list
    const { data: updatedList, error } = await supabaseServer
      .from('project_lists')
      .update(updateData)
      .eq('id', list.id)
      .select('id, public_id, name, position, color, updated_at')
      .single()

    if (error) {
      console.error('Error updating list:', error)
      return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      list: updatedList 
    })

  } catch (error: any) {
    console.error('Error in PUT /api/lists/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const listId = params.id

    // Get list with permissions
    const list = await getListWithPermissions(listId, user.userId)
    if (!list) {
      return NextResponse.json({ error: 'List not found or access denied' }, { status: 404 })
    }

    // Only admins can delete lists
    if (list.user_role !== 'admin') {
      return NextResponse.json({ error: 'Only project admins can delete lists' }, { status: 403 })
    }

    // Check if list has tasks
    const { data: tasks, error: tasksError } = await supabaseServer
      .from('tasks')
      .select('id')
      .eq('list_id', listId)
      .limit(1)

    if (tasksError) {
      console.error('Error checking list tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to check list tasks' }, { status: 500 })
    }

    if (tasks && tasks.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete list with tasks. Please move or delete all tasks first.' 
      }, { status: 400 })
    }

    // Delete the list
    const { error } = await supabaseServer
      .from('project_lists')
      .delete()
      .eq('id', list.id)

    if (error) {
      console.error('Error deleting list:', error)
      return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error in DELETE /api/lists/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}