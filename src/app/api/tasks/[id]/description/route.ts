/**
 * PUT /api/tasks/[id]/description - Update task description
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { id: string }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id
    const body = await req.json()
    const { description } = body

    // Verify task belongs to user or user is admin
    const { data: task } = await supabaseServer
      .from('tasks')
      .select('assigned_to')
      .eq('id', taskId)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (user.role !== 'admin' && task.assigned_to !== user.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Update description
    const { error } = await supabaseServer
      .from('tasks')
      .update({ description: description?.trim() || null })
      .eq('id', taskId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
