/**
 * GET /api/tasks/[id]/attachments - Get task attachments
 * POST /api/tasks/[id]/attachments - Upload attachment
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(req)
    const taskId = params.id

    const { data: attachments, error } = await supabaseServer
      .from('task_attachments')
      .select('id, file_name, file_url, file_type, file_size, created_at, user_id')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching attachments:', error)
      return NextResponse.json({ error: 'Failed to fetch attachments', details: error.message }, { status: 500 })
    }

    // Get user names separately
    const userIdsSet = new Set(attachments?.map(a => a.user_id).filter(Boolean))
    const userIds = Array.from(userIdsSet)
    const { data: users } = await supabaseServer
      .from('users')
      .select('id, name')
      .in('id', userIds)

    const userMap = new Map(users?.map(u => [u.id, u.name]) || [])

    const transformed = attachments?.map(att => ({
      ...att,
      user_name: userMap.get(att.user_id) || 'Unknown'
    })) || []

    return NextResponse.json({ attachments: transformed })
  } catch (error: any) {
    console.error('Error in GET /api/tasks/[id]/attachments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    const taskId = params.id

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabaseServer
      .storage
      .from('task-attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file', details: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseServer
      .storage
      .from('task-attachments')
      .getPublicUrl(fileName)

    // Save attachment record
    const { data: attachment, error } = await supabaseServer
      .from('task_attachments')
      .insert({
        task_id: taskId,
        user_id: user.userId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving attachment:', error)
      return NextResponse.json({ error: 'Failed to save attachment', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, attachment }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/tasks/[id]/attachments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
