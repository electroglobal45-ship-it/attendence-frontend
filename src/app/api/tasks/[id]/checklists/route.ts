/**
 * GET  /api/tasks/[id]/checklists  — get all checklists for a task
 * POST /api/tasks/[id]/checklists  — create a new checklist
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { requireAuthenticatedClient } from '@/lib/supabase-user-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const supabase = requireAuthenticatedClient(req)
    const taskId = params.id

    // Get checklists with items
    const { data: checklists, error } = await supabase
      .from('task_checklists')
      .select(`
        id,
        task_id,
        title,
        position,
        created_at,
        updated_at,
        checklist_items (
          id,
          content,
          is_completed,
          position,
          due_date,
          assigned_to,
          completed_at,
          completed_by,
          created_at,
          updated_at
        )
      `)
      .eq('task_id', taskId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching checklists:', error)
      return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 })
    }

    // Calculate progress for each checklist
    const checklistsWithProgress = checklists?.map(checklist => {
      const items = checklist.checklist_items || []
      const totalItems = items.length
      const completedItems = items.filter(item => item.is_completed).length
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

      return {
        ...checklist,
        total_items: totalItems,
        completed_items: completedItems,
        progress_percentage: progress
      }
    }) || []

    return NextResponse.json({ checklists: checklistsWithProgress })
  } catch (error: any) {
    console.error('Error in GET /api/tasks/[id]/checklists:', error)
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const supabase = requireAuthenticatedClient(req)
    const taskId = params.id
    const body = await req.json()
    const { title, position } = body

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Checklist title is required' }, { status: 400 })
    }

    // Create checklist
    const { data: checklist, error } = await supabase
      .from('task_checklists')
      .insert({
        task_id: taskId,
        title: title.trim(),
        position: position ?? 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating checklist:', error)
      return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('task_activities')
      .insert({
        task_id: taskId,
        user_id: user.userId,
        action: 'checklist_added',
        description: `Added checklist "${title.trim()}"`,
        new_values: { checklist_id: checklist.id, title: checklist.title }
      })

    return NextResponse.json({ 
      success: true, 
      checklist: {
        ...checklist,
        checklist_items: [],
        total_items: 0,
        completed_items: 0,
        progress_percentage: 0
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/tasks/[id]/checklists:', error)
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}
