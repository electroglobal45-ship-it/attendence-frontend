'use client'

import { BoardView } from '@/components/board/BoardView'
import { Sidebar } from '@/components/layout/Sidebar'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const boardId = params.id as string

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8F9FA' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* BoardView has its own header - no extra header needed */}
        <BoardView 
          projectId="c691dc11-b522-4e80-8ae6-337244d2a28d"  
          initialBoardId={boardId}
          onBack={() => router.push('/projects')}
        />
      </div>
    </div>
  )
}
