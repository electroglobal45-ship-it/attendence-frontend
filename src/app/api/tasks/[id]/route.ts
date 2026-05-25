/**
 * GET    /api/tasks/[id]  — get task details
 * PUT    /api/tasks/[id]  — update task
 * DELETE /api/tasks/[id]  — delete task
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

async function getTaskWithPermissions(taskId: string, userId: string) {
  // Get task with project membership info
  const { data: task, error } = await supabaseServer
    .from('tasks')
    .select(`
      *,
      projects!inner(
        id,
        public_id,
        name,
        project_members!inner(role, status)
      )
    `)
    .eq('id', taskId)
    .eq('projects.project_members.user_id', userId)
    .eq('projects.project_members.status', 'active')
    .single()

  if (error || !task) {
    return null
  }

  // When using !inner, projects becomes an array, so we need to access the first element
  const projects = task.projects as any
  const projectMembers = Array.isArray(projects) 
    ? projects[0]?.project_members 
    : projects?.project_members

  return {
    ...task,
    user_role: Array.isArray(projectMembers) 
      ? projectMembers[0]?.role || 'viewer'
      : projectMembers?.role || 'viewer'
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id

    // Check if it's a public_id or UUID
    let taskQuery
    if (taskId.length === 12) {
      // It's a public_id
      taskQuery = supabaseServer
        .from('tasks')
        .select(`
          *,
          project_lists(id, name, position),
          projects(id, public_id, name, color),
          assigned_user:users!tasks_assigned_to_fkey(id, name, email),
          creator:users!tasks_created_by_fkey(id, name, email),
          task_comments(
            id,
            content,
            created_at,
            updated_at,
            users(id, name, email)
          ),
          task_attachments(
            id,
            file_name,
            file_path,
            file_size,
            mime_type,
            created_at,
            users(id, name, email)
          ),
          task_label_assignments(
            task_labels(id, name, color)
          )
        `)
        .eq('public_id', taskId)
    } else {
      // It's a UUID
      taskQuery = supabaseServer
        .from('tasks')
        .select(`
          *,
          project_lists(id, name, position),
          projects(id, public_id, name, color),
          assigned_user:users!tasks_assigned_to_fkey(id, name, email),
          creator:users!tasks_created_by_fkey(id, name, email),
          task_comments(
            id,
            content,
            created_at,
            updated_at,
            users(id, name, email)
          ),
          task_attachments(
            id,
            file_name,
            file_path,
            file_size,
            mime_type,
            created_at,
            users(id, name, email)
          ),
          task_label_assignments(
            task_labels(id, name, color)
          )
        `)
        .eq('id', taskId)
    }

    const { data: task, error } = await taskQuery.single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify user has access to the project
    const { data: membership } = await supabaseServer
      .from('project_members')
      .select('role')
      .eq('project_id', task.project_id)
      .eq('user_id', user.userId)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
    }

    // Sort comments by creation date
    if (task.task_comments) {
      task.task_comments.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    // Extract labels from assignments
    const labels = task.task_label_assignments?.map((assignment: any) => assignment.task_labels) || []

    return NextResponse.json({ 
      task: {
        ...task,
        labels,
        user_role: membership.role,
        task_label_assignments: undefined // Remove the nested structure
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/tasks/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id

    // Get task with permissions
    const taskData = await getTaskWithPermissions(taskId, user.userId)
    if (!taskData) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
    }

    // Viewers cannot edit tasks
    if (taskData.user_role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions to edit task' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      title, 
      description, 
      assigned_to, 
      due_date, 
      priority, 
      status, 
      completion_percentage,
      list_id,
      position
    } = body

    // Validate input
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: 'Task title cannot be empty' }, { status: 400 })
      }
      if (title.length > 255) {
        return NextResponse.json({ error: 'Task title must be less than 255 characters' }, { status: 400 })
      }
    }

    if (completion_percentage !== undefined) {
      if (completion_percentage < 0 || completion_percentage > 100) {
        return NextResponse.json({ error: 'Completion percentage must be between 0 and 100' }, { status: 400 })
      }
    }

    // If assigned_to is being changed, verify the user is a project member
    if (assigned_to !== undefined && assigned_to !== null) {
      const { data: assigneeMembership } = await supabaseServer
        .from('project_members')
        .select('user_id')
        .eq('project_id', taskData.project_id)
        .eq('user_id', assigned_to)
        .eq('status', 'active')
        .single()

      if (!assigneeMembership) {
        return NextResponse.json({ error: 'Cannot assign task to user who is not a project member' }, { status: 400 })
      }
    }

    // If list_id is being changed, verify it belongs to the same project
    if (list_id !== undefined) {
      const { data: list } = await supabaseServer
        .from('project_lists')
        .select('id')
        .eq('id', list_id)
        .eq('project_id', taskData.project_id)
        .single()

      if (!list) {
        return NextResponse.json({ error: 'Invalid list for this project' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {}
    const oldValues: any = {}
    const newValues: any = {}

    if (title !== undefined) {
      updateData.title = title.trim()
      oldValues.title = taskData.title
      newValues.title = title.trim()
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null
      oldValues.description = taskData.description
      newValues.description = description?.trim() || null
    }
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to
      oldValues.assigned_to = taskData.assigned_to
      newValues.assigned_to = assigned_to
    }
    if (due_date !== undefined) {
      updateData.due_date = due_date
      oldValues.due_date = taskData.due_date
      newValues.due_date = due_date
    }
    if (priority !== undefined) {
      updateData.priority = priority
      oldValues.priority = taskData.priority
      newValues.priority = priority
    }
    if (status !== undefined) {
      updateData.status = status
      oldValues.status = taskData.status
      newValues.status = status
      
      // Auto-set completion based on status
      if (status === 'done') {
        updateData.completion_percentage = 100
        updateData.completed_at = new Date().toISOString()
      } else if (taskData.status === 'done' && status !== 'done') {
        updateData.completed_at = null
      }
    }
    if (completion_percentage !== undefined) {
      updateData.completion_percentage = completion_percentage
      oldValues.completion_percentage = taskData.completion_percentage
      newValues.completion_percentage = completion_percentage
    }
    if (list_id !== undefined) {
      updateData.list_id = list_id
      oldValues.list_id = taskData.list_id
      newValues.list_id = list_id
    }
    if (position !== undefined) {
      updateData.position = position
      oldValues.position = taskData.position
      newValues.position = position
    }

    // Update the task
    const { data: updatedTask, error } = await supabaseServer
      .from('tasks')
      .update(updateData)
      .eq('id', taskData.id)
      .select(`
        id,
        public_id,
        title,
        description,
        list_id,
        project_id,
        assigned_to,
        created_by,
        position,
        due_date,
        priority,
        status,
        completion_percentage,
        created_at,
        updated_at,
        completed_at,
        assigned_user:users!tasks_assigned_to_fkey(id, name, email),
        creator:users!tasks_created_by_fkey(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    // Log the activity
    const changedFields = Object.keys(newValues)
    if (changedFields.length > 0) {
      await supabaseServer
        .from('task_activities')
        .insert({
          task_id: taskData.id,
          user_id: user.userId,
          action: 'updated',
          description: `Task updated: ${changedFields.join(', ')}`,
          old_values: oldValues,
          new_values: newValues
        })
    }

    return NextResponse.json({ 
      success: true, 
      task: updatedTask 
    })

  } catch (error: any) {
    console.error('Error in PUT /api/tasks/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id

    // Get task with permissions
    const taskData = await getTaskWithPermissions(taskId, user.userId)
    if (!taskData) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
    }

    // Only members and admins can delete tasks
    if (taskData.user_role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions to delete task' }, { status: 403 })
    }

    // Delete the task (cascade will handle related records)
    const { error } = await supabaseServer
      .from('tasks')
      .delete()
      .eq('id', taskData.id)

    if (error) {
      console.error('Error deleting task:', error)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    // Log the activity (if task_activities table still exists)
    try {
      await supabaseServer
        .from('task_activities')
        .insert({
          task_id: taskData.id,
          user_id: user.userId,
          action: 'deleted',
          description: `Task "${taskData.title}" was deleted`,
          old_values: { title: taskData.title, status: taskData.status }
        })
    } catch (activityError) {
      // Don't fail the request if activity logging fails
      console.error('Error logging task deletion activity:', activityError)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error in DELETE /api/tasks/[id]:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}