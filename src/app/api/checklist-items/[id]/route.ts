/**
 * PUT    /api/checklist-items/[id]  — update item (check/uncheck, edit)
 * DELETE /api/checklist-items/[id]  — delete item
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
    const itemId = params.id
    const body = await req.json()
    const { content, is_completed, position, assigned_to, due_date } = body

    const updateData: any = {}
    if (content !== undefined) updateData.content = content.trim()
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed
      if (is_completed) {
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = user.userId
      } else {
        updateData.completed_at = null
        updateData.completed_by = null
      }
    }
    if (position !== undefined) updateData.position = position
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (due_date !== undefined) updateData.due_date = due_date

    const { data: item, error } = await supabase
      .from('checklist_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      console.error('Error updating checklist item:', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error in PUT /api/checklist-items/[id]:', error)
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
    const itemId = params.id

    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Error deleting checklist item:', error)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/checklist-items/[id]:', error)
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}
