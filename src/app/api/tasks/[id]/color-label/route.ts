import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { id: string }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id

    const body = await req.json()
    const { color_label } = body

    const validLabels = ['none', 'green', 'yellow', 'red']
    if (!validLabels.includes(color_label)) {
      return NextResponse.json({ error: 'Invalid color label' }, { status: 400 })
    }

    const { data: task, error } = await supabaseServer
      .from('tasks')
      .update({ color_label })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error updating color label:', error)
      return NextResponse.json({ error: 'Failed to update color label' }, { status: 500 })
    }

    return NextResponse.json({ success: true, task })
  } catch (error: any) {
    console.error('Error in PUT /api/tasks/[id]/color-label:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
