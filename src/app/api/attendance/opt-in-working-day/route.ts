import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/attendance/opt-in-working-day
 * Employee requests to work on a Sunday or 3rd Saturday
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const userId = user.userId

    const body = await req.json()
    const { date, type, reason } = body

    if (!date || !type) {
      return NextResponse.json({ error: 'Date and type are required' }, { status: 400 })
    }

    if (!['sunday', 'third_saturday'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be sunday or third_saturday' }, { status: 400 })
    }

    // Validate that the date is actually a Sunday or 3rd Saturday
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    const dayOfMonth = dateObj.getDate()

    if (type === 'sunday' && dayOfWeek !== 0) {
      return NextResponse.json({ error: 'Selected date is not a Sunday' }, { status: 400 })
    }

    if (type === 'third_saturday' && (dayOfWeek !== 6 || dayOfMonth < 15 || dayOfMonth > 21)) {
      return NextResponse.json({ error: 'Selected date is not the 3rd Saturday' }, { status: 400 })
    }

    // Check if opt-in already exists
    const { data: existing } = await supabaseServer
      .from('working_day_opt_ins')
      .select('*')
      .eq('employee_id', userId)
      .eq('date', date)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already opted in for this date' }, { status: 400 })
    }

    // Create opt-in (no approval needed)
    const { data, error } = await supabaseServer
      .from('working_day_opt_ins')
      .insert({
        employee_id: userId,
        date,
        type,
        reason: reason || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating opt-in:', error)
      return NextResponse.json({ error: 'Failed to create opt-in' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Successfully opted in to work on this day', optIn: data }, { status: 201 })
  } catch (error) {
    console.error('Error in opt-in-working-day POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/attendance/opt-in-working-day
 * Get employee's opt-in requests
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const userId = user.userId

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // YYYY-MM format

    let query = supabaseServer
      .from('working_day_opt_ins')
      .select('*')
      .eq('employee_id', userId)
      .order('date', { ascending: false })

    if (month) {
      const startDate = `${month}-01`
      const endDate = `${month}-31`
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching opt-ins:', error)
      return NextResponse.json({ error: 'Failed to fetch opt-ins' }, { status: 500 })
    }

    return NextResponse.json({ optIns: data || [] })
  } catch (error) {
    console.error('Error in opt-in-working-day GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/attendance/opt-in-working-day?id=xxx
 * Employee cancels their pending opt-in request
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const userId = user.userId

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Opt-in ID is required' }, { status: 400 })
    }

    // Delete the employee's opt-in
    const { error } = await supabaseServer
      .from('working_day_opt_ins')
      .delete()
      .eq('id', id)
      .eq('employee_id', userId)

    if (error) {
      console.error('Error deleting opt-in:', error)
      return NextResponse.json({ error: 'Failed to delete opt-in' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in opt-in-working-day DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
