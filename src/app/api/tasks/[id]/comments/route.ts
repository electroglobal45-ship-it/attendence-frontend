/**
 * GET  /api/tasks/[id]/comments  — get task comments
 * POST /api/tasks/[id]/comments  — add comment to task
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

async function verifyTaskAccess(taskId: string, userId: string) {
  const { data: task, error } = await supabaseServer
    .from('tasks')
    .select(`
      id,
      project_id,
      projects!inner(
        id,
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
    task_id: task.id,
    project_id: task.project_id,
    user_role: Array.isArray(projectMembers) 
      ? projectMembers[0]?.role || 'viewer'
      : projectMembers?.role || 'viewer'
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id

    // Verify task access
    const taskAccess = await verifyTaskAccess(taskId, user.userId)
    if (!taskAccess) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
    }

    // Get comments for the task
    const { data: comments, error } = await supabaseServer
      .from('task_comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        users(id, name, email)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching task comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json({ comments: comments || [] })

  } catch (error: any) {
    console.error('Error in GET /api/tasks/[id]/comments:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id
    const body = await req.json()
    
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment must be less than 2000 characters' }, { status: 400 })
    }

    // Verify task access
    const taskAccess = await verifyTaskAccess(taskId, user.userId)
    if (!taskAccess) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 })
    }

    // All project members can comment (including viewers)
    // This is different from editing tasks - comments are more open

    // Create the comment
    const { data: comment, error } = await supabaseServer
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.userId,
        content: content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        users(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Log the activity
    await supabaseServer
      .from('task_activities')
      .insert({
        task_id: taskId,
        user_id: user.userId,
        action: 'commented',
        description: `Added a comment`,
        new_values: { comment_content: content.trim() }
      })

    return NextResponse.json({ 
      success: true, 
      comment 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/tasks/[id]/comments:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}