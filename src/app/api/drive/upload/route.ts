import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const formData = await req.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string | undefined
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileData = {
      originalname: file.name,
      mimetype: file.type,
      buffer
    }
    
    const uploadedFile = await DriveService.uploadFile(user.userId, fileData, folderId)
    
    return NextResponse.json({ file: uploadedFile })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
