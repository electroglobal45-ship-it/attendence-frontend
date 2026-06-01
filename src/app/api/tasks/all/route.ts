/**
 * GET /api/tasks/all - Get all tasks (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { data: tasks, error } = await supabaseServer
      .from('tasks')
      .select('id, title, description, status, priority, due_date, created_at, assigned_to')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks', details: error.message }, { status: 500 })
    }

    // Get user names separately
    const userIdsSet = new Set(tasks?.map(t => t.assigned_to).filter(Boolean))
    const userIds = Array.from(userIdsSet)
    const { data: users } = await supabaseServer
      .from('users')
      .select('id, name, email')
      .in('id', userIds)

    const userMap = new Map(users?.map(u => [u.id, u]) || [])

    // Transform data
    const transformedTasks = tasks?.map(task => ({
      ...task,
      assigned_to_name: task.assigned_to ? userMap.get(task.assigned_to)?.name || 'Unknown' : 'Unassigned'
    })) || []

    return NextResponse.json({ tasks: transformedTasks })
  } catch (error: any) {
    console.error('Error in GET /api/tasks/all:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}
