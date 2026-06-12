import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const user = await requireAuth(req)
    await DriveService.revokeShare(user.userId, params.shareId)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to revoke share' },
      { status: 500 }
    )
  }
}
