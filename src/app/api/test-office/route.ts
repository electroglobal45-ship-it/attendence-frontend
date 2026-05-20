/**
 * TEST ENDPOINT: Check if office location exists
 * Visit: http://localhost:3000/api/test-office
 */

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Testing office location fetch...')
    
    // Test 1: Check if table exists
    const { data: tables, error: tableError } = await supabaseServer
      .from('office_locations')
      .select('*')
      .limit(1)

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'Table query failed',
        details: tableError,
        message: 'office_locations table might not exist'
      })
    }

    // Test 2: Get all office locations
    const { data: allOffices, error: allError } = await supabaseServer
      .from('office_locations')
      .select('*')

    console.log('All offices:', allOffices)

    // Test 3: Get active office location
    const { data: activeOffice, error: activeError } = await supabaseServer
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    console.log('Active office:', activeOffice)

    return NextResponse.json({
      success: true,
      allOffices: allOffices || [],
      activeOffice: activeOffice || null,
      counts: {
        total: allOffices?.length || 0,
        active: activeOffice ? 1 : 0
      },
      message: activeOffice 
        ? `✅ Found active office: ${activeOffice.name}` 
        : '❌ No active office location found'
    })
  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}
