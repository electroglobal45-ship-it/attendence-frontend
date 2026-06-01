/**
 * GET /api/tasks/[id]/comments - Get task comments
 * POST /api/tasks/[id]/comments - Add comment to task
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(req)
    const taskId = params.id

    const { data: comments, error } = await supabaseServer
      .from('task_comments')
      .select('id, comment, is_system, created_at, user_id')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments', details: error.message }, { status: 500 })
    }

    // Get user names separately
    const userIds = [...new Set(comments?.map(c => c.user_id).filter(Boolean))]
    const { data: users } = await supabaseServer
      .from('users')
      .select('id, name')
      .in('id', userIds)

    const userMap = new Map(users?.map(u => [u.id, u.name]) || [])

    const transformed = comments?.map(c => ({
      ...c,
      user_name: userMap.get(c.user_id) || 'Unknown'
    })) || []

    return NextResponse.json({ comments: transformed })
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
    const { comment } = body

    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    const { data: newComment, error } = await supabaseServer
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.userId,
        comment: comment.trim(),
        is_system: false
      })
      .select('id, comment, is_system, created_at, user_id')
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Failed to create comment', details: error.message }, { status: 500 })
    }

    // Get user name
    const { data: userData } = await supabaseServer
      .from('users')
      .select('name')
      .eq('id', user.userId)
      .single()

    return NextResponse.json({ 
      success: true, 
      comment: {
        ...newComment,
        user_name: userData?.name || 'Unknown'
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/tasks/[id]/comments:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}
