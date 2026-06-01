/**
 * GET  /api/projects/[id]/lists  — get project lists
 * POST /api/projects/[id]/lists  — create new list
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const projectIdParam = params.id

    // Resolve public_id to UUID if needed
    let projectId = projectIdParam
    if (projectIdParam.length === 12) {
      // It's a public_id, resolve to UUID
      const { data: project, error: projectError } = await supabaseServer
        .from('projects')
        .select('id')
        .eq('public_id', projectIdParam)
        .eq('is_active', true)
        .single()

      if (projectError || !project) {
        console.error('Project not found:', projectError)
        return NextResponse.json({ error: 'Board not found', details: projectError?.message }, { status: 404 })
      }
      projectId = project.id
    }

    // Get project lists with task counts
    const { data: lists, error } = await supabaseServer
      .from('project_lists')
      .select(`
        id,
        public_id,
        name,
        position,
        color,
        created_at,
        updated_at,
        tasks(
          id,
          title,
          status,
          priority,
          assigned_to,
          due_date,
          position
        )
      `)
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching project lists:', error)
      return NextResponse.json({ error: 'Failed to fetch lists', details: error.message }, { status: 500 })
    }

    // Transform data to include task counts and sort tasks by position
    const transformedLists = lists?.map(list => ({
      ...list,
      task_count: list.tasks?.length || 0,
      tasks: list.tasks?.sort((a: any, b: any) => a.position - b.position) || []
    })) || []

    return NextResponse.json({ lists: transformedLists })

  } catch (error: any) {
    console.error('Error in GET /api/projects/[id]/lists:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const projectIdParam = params.id

    // Resolve public_id to UUID if needed
    let projectId = projectIdParam
    if (projectIdParam.length === 12) {
      // It's a public_id, resolve to UUID
      const { data: project, error: projectError } = await supabaseServer
        .from('projects')
        .select('id')
        .eq('public_id', projectIdParam)
        .eq('is_active', true)
        .single()

      if (projectError || !project) {
        console.error('Project not found:', projectError)
        return NextResponse.json({ error: 'Board not found', details: projectError?.message }, { status: 404 })
      }
      projectId = project.id
    }

    const body = await req.json()
    const { name, color, position } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 })
    }

    if (name.length > 255) {
      return NextResponse.json({ error: 'List name must be less than 255 characters' }, { status: 400 })
    }

    // Get the next position if not provided
    let listPosition = position
    if (listPosition === undefined) {
      const { data: lastList } = await supabaseServer
        .from('project_lists')
        .select('position')
        .eq('project_id', projectId)
        .order('position', { ascending: false })
        .limit(1)
        .single()

      listPosition = (lastList?.position || -1) + 1
    }

    // Create the list
    const { data: list, error } = await supabaseServer
      .from('project_lists')
      .insert({
        name: name.trim(),
        project_id: projectId,
        position: listPosition,
        color: color || '#6B7280',
        created_by: user.userId
      })
      .select('id, public_id, name, position, color, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating project list:', error)
      return NextResponse.json({ error: 'Failed to create list', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      list: {
        ...list,
        task_count: 0,
        tasks: []
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/projects/[id]/lists:', error)
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}