/**
 * POST /api/location/test
 * Test location endpoint for GPS validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json()

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    const { data: office, error } = await supabaseServer
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (error || !office) {
      return NextResponse.json({ error: 'Office location not configured' }, { status: 404 })
    }

    const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude)
    const isWithinRadius = distance <= office.radius_meters

    return NextResponse.json({
      success: true,
      testLocation: { latitude, longitude },
      officeLocation: {
        latitude: office.latitude,
        longitude: office.longitude,
        name: office.name,
      },
      distance: Math.round(distance),
      radiusMeters: office.radius_meters,
      isWithinRadius,
      status: isWithinRadius ? 'PRESENT' : 'ABSENT',
      message: isWithinRadius
        ? `✓ Location is within ${office.radius_meters}m radius. Attendance can be marked as PRESENT.`
        : `✗ Location is ${Math.round(distance)}m away from office. Attendance will be marked as ABSENT.`,
    })
  } catch (error) {
    console.error('Location test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
