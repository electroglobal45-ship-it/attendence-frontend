/**
 * PUT /api/tasks/[id]/move - Move task to different status
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: { id: string }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id

    const body = await req.json()
    const { status } = body

    if (!status || !['todo', 'in_progress', 'review', 'done'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify task belongs to user (for employees) or allow admin
    const { data: task, error: fetchError } = await supabaseServer
      .from('tasks')
      .select('assigned_to')
      .eq('id', taskId)
      .single()

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (user.role !== 'admin' && task.assigned_to !== user.userId) {
      return NextResponse.json({ error: 'You can only move your own tasks' }, { status: 403 })
    }

    // Update task status
    const updateData: any = { status }
    
    // If moving to done, set completed_at
    if (status === 'done') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: updatedTask, error } = await supabaseServer
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Failed to update task', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (error: any) {
    console.error('Error in PUT /api/tasks/[id]/move:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}
