/**
 * DELETE /api/tasks/attachments/[id] - Delete attachment
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { id: string }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const attachmentId = params.id

    const { error } = await supabaseServer
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('user_id', user.userId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
