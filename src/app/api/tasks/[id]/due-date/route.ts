import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const user = await requireAdmin(request)

    const { due_date } = await request.json()

    if (!due_date) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 })
    }

    const { data: task, error } = await supabaseServer
      .from('tasks')
      .update({ due_date })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating due date:', error)
      return NextResponse.json({ error: 'Failed to update due date' }, { status: 500 })
    }

    // Add system comment about due date change
    await supabaseServer
      .from('task_comments')
      .insert({
        task_id: params.id,
        user_id: user.userId,
        comment: `Due date updated to ${new Date(due_date).toLocaleDateString()}`,
        is_system: true
      })

    return NextResponse.json({ task })
  } catch (error: any) {
    console.error('Error in due-date route:', error)
    const status = error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}
