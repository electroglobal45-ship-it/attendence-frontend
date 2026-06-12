import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase-auth-helper'
import { DriveService } from '@/lib/drive-service'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const user = await requireAuth(req)
    const fileStream = await DriveService.downloadFile(user.userId, params.fileId)
    
    // Convert stream to buffer
    const chunks: any[] = []
    for await (const chunk of fileStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment'
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to download file' },
      { status: 500 }
    )
  }
}
