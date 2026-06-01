/**
 * GET  /api/tasks  — get user's tasks (with filters)
 * POST /api/tasks  — create new task
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { requireAuthenticatedClient } from '@/lib/supabase-user-client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const supabase = requireAuthenticatedClient(req)
    const { searchParams } = new URL(req.url)
    
    // Query parameters
    const projectId = searchParams.get('project_id')
    const listId = searchParams.get('list_id')
    const assignedToMe = searchParams.get('assigned_to_me') === 'true'
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const dueSoon = searchParams.get('due_soon') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // First, get all project IDs the user has access to
    const { data: userProjects, error: projectsError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.userId)
      .eq('status', 'active')

    if (projectsError) {
      console.error('Error fetching user projects:', projectsError)
      return NextResponse.json({ error: 'Failed to fetch user projects' }, { status: 500 })
    }

    const accessibleProjectIds = userProjects?.map(p => p.project_id) || []

    if (accessibleProjectIds.length === 0) {
      // User has no projects, return empty result
      return NextResponse.json({ 
        tasks: [],
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false
        }
      })
    }

    // Build query
    let query = supabase
      .from('tasks')
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
        project_lists(id, name, project_id),
        projects(id, public_id, name, color)
      `)
      .in('project_id', accessibleProjectIds)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (listId) {
      query = query.eq('list_id', listId)
    }

    if (assignedToMe) {
      query = query.eq('assigned_to', user.userId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (dueSoon) {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      query = query.lte('due_date', nextWeek.toISOString())
      query = query.gte('due_date', new Date().toISOString())
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('project_id', accessibleProjectIds)

    // Apply same filters for count
    if (projectId) countQuery = countQuery.eq('project_id', projectId)
    if (listId) countQuery = countQuery.eq('list_id', listId)
    if (assignedToMe) countQuery = countQuery.eq('assigned_to', user.userId)
    if (status) countQuery = countQuery.eq('status', status)
    if (priority) countQuery = countQuery.eq('priority', priority)

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting tasks:', countError)
    }

    return NextResponse.json({ 
      tasks: tasks || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/tasks:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const supabase = requireAuthenticatedClient(req)
    const body = await req.json()
    
    const { 
      title, 
      description, 
      list_id, 
      project_id, 
      assigned_to, 
      due_date, 
      priority = 'medium',
      position,
      status = 'todo'
    } = body

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
    }

    if (title.length > 255) {
      return NextResponse.json({ error: 'Task title must be less than 255 characters' }, { status: 400 })
    }

    // NEW: Support creating tasks without projects (for simple task management)
    if (!project_id && !list_id) {
      // Simple task creation (no project/list required)
      if (!assigned_to) {
        return NextResponse.json({ error: 'Task must be assigned to someone' }, { status: 400 })
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          assigned_to,
          created_by: user.userId,
          due_date: due_date || null,
          priority,
          status,
          position: position || 0,
          project_id: null,
          list_id: null,
          completion_percentage: 0
        })
        .select(`
          id,
          public_id,
          title,
          description,
          assigned_to,
          created_by,
          position,
          due_date,
          priority,
          status,
          completion_percentage,
          created_at,
          updated_at
        `)
        .single()

      if (error) {
        console.error('Error creating simple task:', error)
        return NextResponse.json({ error: 'Failed to create task', details: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        task 
      }, { status: 201 })
    }

    // OLD: Project-based task creation (for board/list tasks)
    if (!list_id || !project_id) {
      return NextResponse.json({ error: 'list_id and project_id are required for board tasks' }, { status: 400 })
    }

    // Verify user has access to the project
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Members and admins can create tasks
    if (membership.role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions to create tasks' }, { status: 403 })
    }

    // Verify the list belongs to the project
    const { data: list, error: listError } = await supabase
      .from('project_lists')
      .select('id')
      .eq('id', list_id)
      .eq('project_id', project_id)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'Invalid list for this project' }, { status: 400 })
    }

    // If assigned_to is provided, verify the user is a project member
    if (assigned_to) {
      const { data: assigneeMembership } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', project_id)
        .eq('user_id', assigned_to)
        .eq('status', 'active')
        .single()

      if (!assigneeMembership) {
        return NextResponse.json({ error: 'Cannot assign task to user who is not a project member' }, { status: 400 })
      }
    }

    // Get the next position if not provided
    let taskPosition = position
    if (taskPosition === undefined) {
      const { data: lastTask } = await supabase
        .from('tasks')
        .select('position')
        .eq('list_id', list_id)
        .order('position', { ascending: false })
        .limit(1)
        .single()

      taskPosition = (lastTask?.position || -1) + 1
    }

    // Create the task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        list_id,
        project_id,
        assigned_to: assigned_to || null,
        created_by: user.userId,
        position: taskPosition,
        due_date: due_date || null,
        priority,
        status: 'todo',
        completion_percentage: 0
      })
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
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Log the activity
    await supabase
      .from('task_activities')
      .insert({
        task_id: task.id,
        user_id: user.userId,
        action: 'created',
        description: `Task "${task.title}" was created`,
        new_values: { title: task.title, status: task.status, priority: task.priority }
      })

    return NextResponse.json({ 
      success: true, 
      task 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/tasks:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}