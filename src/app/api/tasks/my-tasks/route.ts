/**
 * GET /api/tasks/my-tasks - Get tasks assigned to current user (employee)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    const { data: tasks, error } = await supabaseServer
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        created_at
      `)
      .eq('assigned_to', user.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching my tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks: tasks || [] })
  } catch (error: any) {
    console.error('Error in GET /api/tasks/my-tasks:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}
