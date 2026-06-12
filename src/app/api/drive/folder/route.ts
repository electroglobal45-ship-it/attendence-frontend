import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const { folderName, parentFolderId } = await req.json()
    
    if (!folderName) {
      return NextResponse.json({ error: 'Folder name required' }, { status: 400 })
    }
    
    const folder = await DriveService.createFolder(user.userId, folderName, parentFolderId)
    
    return NextResponse.json({ folder })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create folder' },
      { status: 500 }
    )
  }
}
