import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const user = await requireAuth(req)
    await DriveService.markAsViewed(params.shareId, user.userId)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to mark as viewed' },
      { status: 500 }
    )
  }
}
