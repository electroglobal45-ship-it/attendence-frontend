/**
 * GET  /api/settings/office  — get active office location
 * POST /api/settings/office  — create or update office location (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data: office, error } = await supabaseServer
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching office:', error)
      return NextResponse.json({ office: null })
    }

    return NextResponse.json({ office: office || null })
  } catch (error) {
    console.error('GET /api/settings/office error:', error)
    return NextResponse.json({ office: null })
  }
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

    const { name, latitude, longitude, radiusMeters } = await req.json()

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'name, latitude, and longitude are required' }, { status: 400 })
    }

    const { data: office, error } = await supabaseServer
      .from('office_locations')
      .upsert({
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_meters: radiusMeters || 100,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating office:', error)
      return NextResponse.json({ error: 'Failed to update office location' }, { status: 500 })
    }

    return NextResponse.json({ success: true, office })
  } catch (error) {
    console.error('POST /api/settings/office error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
