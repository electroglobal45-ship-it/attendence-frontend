import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, JWT_SECRET) as any

    // Only admins can update due dates
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update due dates' }, { status: 403 })
    }

    const { due_date } = await request.json()

    if (!due_date) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 })
    }

    const { data: task, error } = await supabase
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
    await supabase
      .from('task_comments')
      .insert({
        task_id: params.id,
        user_id: decoded.userId,
        comment: `Due date updated to ${new Date(due_date).toLocaleDateString()}`,
        is_system: true
      })

    return NextResponse.json({ task })
  } catch (error: any) {
    console.error('Error in due-date route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
