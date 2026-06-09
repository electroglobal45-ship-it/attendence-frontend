'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { BoardView } from '@/components/board/BoardView'
import { Plus, RefreshCw, Layout, ChevronRight } from 'lucide-react'

const PROJECT_ID = 'c691dc11-b522-4e80-8ae6-337244d2a28d'

interface Board {
  id: string
  name: string
  description?: string
  created_at: string
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const token = () => localStorage.getItem('authToken')

  const fetchBoards = async () => {
    setLoading(true)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/boards/project/${PROJECT_ID}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setBoards(data.data?.boards || [])
      }
    } catch {}
    finally { setLoading(false) }
  }

  const createBoard = async () => {
    if (!newBoardName.trim()) return
    setCreatingBoard(true)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/boards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: PROJECT_ID, name: newBoardName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        const board = data.data?.board || data.data
        if (board) {
          setBoards(prev => [...prev, board])
          setSelectedBoardId(board.id)
        }
        setNewBoardName('')
        setShowCreate(false)
      }
    } catch {}
    finally { setCreatingBoard(false) }
  }

  useEffect(() => { fetchBoards() }, [])

  // If a board is selected, show the BoardView for that board
  if (selectedBoardId) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#F8F9FA' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* BoardView has its own header with back button - no duplicate header needed */}
          <BoardView 
            projectId={PROJECT_ID} 
            initialBoardId={selectedBoardId}
            onBack={() => setSelectedBoardId(null)}
          />
        </div>
      </div>
    )
  }

  // Boards grid view
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F8F9FA', fontFamily: 'system-ui,sans-serif' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          background: '#FFFFFF', borderBottom: '1px solid #E5E7EB',
          padding: '16px 28px', flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ color: '#111827', fontSize: 22, fontWeight: 800, margin: 0 }}>Boards</h1>
              <p style={{ color: '#6B7280', fontSize: 13, margin: '3px 0 0' }}>
                {boards.length} board{boards.length !== 1 ? 's' : ''} in your workspace
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={fetchBoards}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', background: '#FFFFFF',
                  border: '1px solid #E5E7EB', borderRadius: 8,
                  color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
                Refresh
              </button>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', background: '#111827',
                  border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Plus size={14} /> New Board
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#111827', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#6B7280', fontSize: 14 }}>Loading boards...</p>
            </div>
          ) : boards.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 16, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layout size={36} color="#9CA3AF" />
              </div>
              <h3 style={{ color: '#111827', fontSize: 20, fontWeight: 700, margin: 0 }}>No boards yet</h3>
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0, maxWidth: 360 }}>
                Create your first board to start organising tasks with Kanban columns
              </p>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', background: '#111827',
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  marginTop: 8,
                }}
              >
                <Plus size={16} /> Create Your First Board
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {boards.map((board, i) => {
                const colors = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#6366F1']
                const color = colors[i % colors.length]
                return (
                  <button
                    key={board.id}
                    onClick={() => setSelectedBoardId(board.id)}
                    style={{
                      background: '#FFFFFF', border: '1px solid #E5E7EB',
                      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      textAlign: 'left', padding: 0,
                      transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
                      e.currentTarget.style.borderColor = color
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                      e.currentTarget.style.borderColor = '#E5E7EB'
                    }}
                  >
                    {/* Colour strip */}
                    <div style={{ height: 80, background: color, position: 'relative', overflow: 'hidden' }}>
                      {/* Grid pattern overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 20px)',
                      }} />
                      {/* Mini kanban columns preview */}
                      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', gap: 5 }}>
                        {[3, 5, 2].map((n, j) => (
                          <div key={j} style={{ width: 30, background: 'rgba(255,255,255,0.25)', borderRadius: 3, padding: '3px 3px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {Array.from({ length: Math.min(n, 3) }).map((_, k) => (
                              <div key={k} style={{ height: 4, background: 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Board info */}
                    <div style={{ padding: '12px 14px 14px' }}>
                      <p style={{ color: '#111827', fontSize: 14, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {board.name}
                      </p>
                      {board.description && (
                        <p style={{ color: '#6B7280', fontSize: 12, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {board.description}
                        </p>
                      )}
                      <p style={{ color: '#9CA3AF', fontSize: 11, margin: '6px 0 0' }}>
                        {new Date(board.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </button>
                )
              })}

              {/* Create new board card */}
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  background: '#F9FAFB', border: '2px dashed #D1D5DB',
                  borderRadius: 12, cursor: 'pointer', padding: '40px 20px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 10, transition: 'border-color 0.15s, background 0.15s',
                  minHeight: 160,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#111827'; e.currentTarget.style.background = '#F3F4F6' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = '#F9FAFB' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color="#6B7280" />
                </div>
                <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>Create new board</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Board Modal */}
      {showCreate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: '#111827', fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>Create Board</h3>
            <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 20px' }}>Give your board a name to get started</p>
            <label style={{ display: 'block', color: '#374151', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Board Name</label>
            <input
              autoFocus
              type="text"
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createBoard(); if (e.key === 'Escape') setShowCreate(false) }}
              placeholder="e.g. Development, Marketing..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', border: '1px solid #E5E7EB',
                borderRadius: 8, fontSize: 14, color: '#111827',
                outline: 'none', marginBottom: 20,
              }}
              onFocus={e => (e.target.style.borderColor = '#111827')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{ flex: 1, padding: '10px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={createBoard}
                disabled={!newBoardName.trim() || creatingBoard}
                style={{
                  flex: 1, padding: '10px', background: '#111827', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: newBoardName.trim() ? 'pointer' : 'not-allowed',
                  opacity: newBoardName.trim() ? 1 : 0.5,
                }}
              >
                {creatingBoard ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
