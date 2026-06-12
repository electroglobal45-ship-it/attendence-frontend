import { NextRequest, NextResponse } from 'next/server'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // userId
    
    console.log('[Drive Callback] Received:', { hasCode: !!code, userId: state })
    
    if (!code || !state) {
      console.error('[Drive Callback] Missing params:', { code: !!code, state: !!state })
      return NextResponse.redirect(new URL('/drive?error=missing_params', req.url))
    }

    const result = await DriveService.handleCallback(state, code)
    console.log('[Drive Callback] Success:', result)
    
    return NextResponse.redirect(new URL('/drive?connected=true', req.url))
  } catch (error: any) {
    console.error('[Drive Callback] Error:', error)
    return NextResponse.redirect(new URL('/drive?error=connection_failed', req.url))
  }
}
