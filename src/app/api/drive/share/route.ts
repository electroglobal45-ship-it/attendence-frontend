import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const { fileId, shareWith, permission, message } = await req.json()
    
    if (!fileId || !shareWith || !Array.isArray(shareWith)) {
      return NextResponse.json(
        { error: 'fileId and shareWith array required' },
        { status: 400 }
      )
    }
    
    const shares = await DriveService.shareFile(
      user.userId,
      fileId,
      shareWith,
      permission || 'reader',
      message
    )
    
    return NextResponse.json({ shares })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to share file' },
      { status: 500 }
    )
  }
}
