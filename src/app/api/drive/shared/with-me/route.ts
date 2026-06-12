import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const shares = await DriveService.getSharedWithMe(user.userId)
    
    return NextResponse.json({ shares })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get shared files' },
      { status: 500 }
    )
  }
}
