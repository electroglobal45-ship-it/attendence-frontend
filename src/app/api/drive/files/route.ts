import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const folderId = searchParams.get('folderId') || undefined
    
    const files = await DriveService.listFiles(user.userId, folderId)
    
    return NextResponse.json({ files })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    )
  }
}
