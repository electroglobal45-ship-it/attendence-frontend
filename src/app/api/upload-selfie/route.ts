/**
 * POST /api/upload-selfie
 * Upload selfie to Supabase Storage using service role
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(req)
    const userId = user.userId

    // Get the file from form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${userId}/${timestamp}-${file.name}`

    console.log('[Upload Selfie] Uploading:', filename, 'Size:', file.size, 'bytes')

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage using service role (bypasses RLS)
    const { data, error } = await supabaseServer.storage
      .from('selfies')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('[Upload Selfie] Error:', error)
      return NextResponse.json({ 
        error: error.message || 'Upload failed',
        details: error
      }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseServer.storage
      .from('selfies')
      .getPublicUrl(filename)

    console.log('[Upload Selfie] Success:', urlData.publicUrl)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      filename: filename
    })
  } catch (error: any) {
    console.error('[Upload Selfie] Exception:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
