/**
 * PUT    /api/checklists/[id]  — update checklist
 * DELETE /api/checklists/[id]  — delete checklist
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { requireAuthenticatedClient } from '@/lib/supabase-user-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const supabase = requireAuthenticatedClient(req)
    const checklistId = params.id
    const body = await req.json()
    const { title, position } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title.trim()
    if (position !== undefined) updateData.position = position

    const { data: checklist, error } = await supabase
      .from('task_checklists')
      .update(updateData)
      .eq('id', checklistId)
      .select()
      .single()

    if (error) {
      console.error('Error updating checklist:', error)
      return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
    }

    return NextResponse.json({ success: true, checklist })
  } catch (error: any) {
    console.error('Error in PUT /api/checklists/[id]:', error)
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const supabase = requireAuthenticatedClient(req)
    const checklistId = params.id

    // Get checklist info before deleting
    const { data: checklist } = await supabase
      .from('task_checklists')
      .select('task_id, title')
      .eq('id', checklistId)
      .single()

    const { error } = await supabase
      .from('task_checklists')
      .delete()
      .eq('id', checklistId)

    if (error) {
      console.error('Error deleting checklist:', error)
      return NextResponse.json({ error: 'Failed to delete checklist' }, { status: 500 })
    }

    // Log activity
    if (checklist) {
      await supabase
        .from('task_activities')
        .insert({
          task_id: checklist.task_id,
          user_id: user.userId,
          action: 'checklist_deleted',
          description: `Deleted checklist "${checklist.title}"`,
          old_values: { checklist_id: checklistId, title: checklist.title }
        })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/checklists/[id]:', error)
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}
