/**
 * POST /api/tasks/create - Create a new task (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const body = await req.json()
    const { title, description, assigned_to, due_date, priority, status } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
    }

    if (!assigned_to) {
      return NextResponse.json({ error: 'Task must be assigned to an employee' }, { status: 400 })
    }

    // Create task without project/list dependencies
    const { data: task, error } = await supabaseServer
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        assigned_to,
        created_by: user.userId,
        due_date: due_date || null,
        priority: priority || 'medium',
        status: status || 'todo',
        position: 0,
        project_id: null,
        list_id: null
      })
      .select('id, title, description, status, priority, due_date, created_at, assigned_to')
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: 'Failed to create task', details: error.message }, { status: 500 })
    }

    // Get assigned user name separately
    const { data: assignedUser } = await supabaseServer
      .from('users')
      .select('name, email')
      .eq('id', assigned_to)
      .single()

    return NextResponse.json({ 
      success: true, 
      task: {
        ...task,
        assigned_to_name: assignedUser?.name || 'Unassigned'
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/tasks/create:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}
