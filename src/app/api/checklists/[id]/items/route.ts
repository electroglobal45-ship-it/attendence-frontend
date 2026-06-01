/**
 * POST /api/checklists/[id]/items  — add item to checklist
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { requireAuthenticatedClient } from '@/lib/supabase-user-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req)
    const supabase = requireAuthenticatedClient(req)
    const checklistId = params.id
    const body = await req.json()
    const { content, position, assigned_to, due_date } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Item content is required' }, { status: 400 })
    }

    // Create item
    const { data: item, error } = await supabase
      .from('checklist_items')
      .insert({
        checklist_id: checklistId,
        content: content.trim(),
        position: position ?? 0,
        assigned_to: assigned_to || null,
        due_date: due_date || null,
        is_completed: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating checklist item:', error)
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/checklists/[id]/items:', error)
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}
