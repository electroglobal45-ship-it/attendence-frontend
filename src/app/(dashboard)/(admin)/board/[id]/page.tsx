'use client'

import { BoardView } from '@/components/board/BoardView'
import { useParams, useRouter } from 'next/navigation'

export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const boardId = params.id as string

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
      <BoardView 
        projectId="c691dc11-b522-4e80-8ae6-337244d2a28d"  
        initialBoardId={boardId}
        onBack={() => router.push('/projects')}
      />
    </div>
  )
}
