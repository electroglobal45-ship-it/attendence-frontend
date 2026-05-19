/**
 * GET    /api/holidays          — list all active holidays (public)
 * POST   /api/holidays          — admin adds a holiday
 * DELETE /api/holidays?id=xxx   — admin removes a holiday
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('holidays')
    .select('*')
    .eq('is_active', true)
    .order('date', { ascending: true })

  if (error) {
    console.error('GET /api/holidays error:', error)
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 })
  }
  return NextResponse.json({ holidays: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { date, name } = await req.json()
    if (!date || !name) {
      return NextResponse.json({ error: 'date and name required' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('holidays')
      .upsert({ date, name, is_active: true }, { onConflict: 'date' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to add holiday', details: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, holiday: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = verifyToken(authHeader.substring(7))
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabaseServer
      .from('holidays')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
