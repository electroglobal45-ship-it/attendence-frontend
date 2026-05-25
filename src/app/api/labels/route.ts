/**
 * GET  /api/labels  — get labels for a project
 * POST /api/labels  — create new label
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    // Verify user has access to the project
    const { data: membership, error: membershipError } = await supabaseServer
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Get labels for the project
    const { data: labels, error } = await supabaseServer
      .from('task_labels')
      .select(`
        id,
        name,
        color,
        created_at,
        created_by,
        creator:users!task_labels_created_by_fkey(id, name, email)
      `)
      .eq('project_id', projectId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching labels:', error)
      return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 })
    }

    return NextResponse.json({ labels: labels || [] })

  } catch (error: any) {
    console.error('Error in GET /api/labels:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    
    const { name, color, project_id } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Label name is required' }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Label name must be less than 100 characters' }, { status: 400 })
    }

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json({ error: 'Valid hex color is required (e.g., #FF0000)' }, { status: 400 })
    }

    // Verify user has access to the project
    const { data: membership, error: membershipError } = await supabaseServer
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.userId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Members and admins can create labels
    if (membership.role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions to create labels' }, { status: 403 })
    }

    // Check for duplicate label name in the project
    const { data: existingLabel } = await supabaseServer
      .from('task_labels')
      .select('id')
      .eq('project_id', project_id)
      .eq('name', name.trim())
      .single()

    if (existingLabel) {
      return NextResponse.json({ error: 'A label with this name already exists in the project' }, { status: 409 })
    }

    // Create the label
    const { data: label, error } = await supabaseServer
      .from('task_labels')
      .insert({
        name: name.trim(),
        color: color.toUpperCase(),
        project_id,
        created_by: user.userId
      })
      .select(`
        id,
        name,
        color,
        created_at,
        created_by,
        creator:users!task_labels_created_by_fkey(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating label:', error)
      return NextResponse.json({ error: 'Failed to create label' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      label 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/labels:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}