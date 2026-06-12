import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const authUrl = DriveService.getAuthUrl(user.userId)
    
    return NextResponse.json({ authUrl })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 401 }
    )
  }
}
