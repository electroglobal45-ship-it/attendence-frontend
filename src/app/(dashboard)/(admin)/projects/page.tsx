'use client'

import React, { useEffect, useRef, useState } from 'react'
import { BoardView } from '@/components/board/BoardView'
import { Plus, RefreshCw, Layout, ChevronRight, Trash2, CheckSquare, Square } from 'lucide-react'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import { useAuth } from '@/lib/auth-context'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { boardsAPI } from '@/lib/kanban-api'

const PROJECT_ID = 'c691dc11-b522-4e80-8ae6-337244d2a28d'

interface Board {
  id: string
  name: string
  description?: string
  created_at: string
}

export default function BoardsPage() {
  const { user } = useAuth()
  const storeProjects = usePrefetchStore((state) => state.projects)
  const [boards, setBoards] = useState<Board[]>(() => storeProjects ?? [])
  const [loading, setLoading] = useState(() => !storeProjects || storeProjects.length === 0)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [teamLeaders, setTeamLeaders] = useState<any[]>([])
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('')
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([])
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  const token = () => localStorage.getItem('authToken')

  const fetchBoards = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/boards/project/${PROJECT_ID}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (res.ok) {
        const data = await res.json()
        const fetchedBoards = data.data?.boards || []
        setBoards(fetchedBoards)
        usePrefetchStore.setState({
          projects: fetchedBoards,
          status: { ...usePrefetchStore.getState().status, projects: 'done' }
        })
      }
    } catch {}
    finally { setLoading(false) }
  }

  // Fetch team leaders for board assignment
  const fetchTeamLeaders = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await response.json()
      const tls = (data.data?.users || []).filter((u: any) => {
        const r = u.role?.toLowerCase() || ''
        return r === 'team leader' || r === 'team_leader' || r === 'leader'
      })
      setTeamLeaders(tls)
    } catch (err) {
      console.error('Failed to fetch team leaders:', err)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedBoardIds.length === 0) return
    setDeletingBulk(true)
    try {
      await Promise.all(selectedBoardIds.map(id => boardsAPI.deleteBoard(id)))
      const remaining = boards.filter(b => !selectedBoardIds.includes(b.id))
      setBoards(remaining)
      usePrefetchStore.setState({ projects: remaining })
      setSelectedBoardIds([])
      setBulkMode(false)
      setShowBulkDeleteConfirm(false)
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected boards')
    } finally {
      setDeletingBulk(false)
    }
  }

  const createBoard = async () => {
    if (!newBoardName.trim()) return
    setCreatingBoard(true)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/boards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project_id: PROJECT_ID, 
          name: newBoardName.trim(),
          team_leader_id: selectedTeamLeader || null
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const board = data.data?.board || data.data
        if (board) {
          setBoards(prev => [...prev, board])
          usePrefetchStore.getState().addProject(board)
          setSelectedBoardId(board.id)
        }
        setNewBoardName('')
        setSelectedTeamLeader('')
        setShowCreate(false)
      }
    } catch {}
    finally { setCreatingBoard(false) }
  }

  // Sync state if prefetch store updates externally
  useEffect(() => {
    if (storeProjects && storeProjects.length > 0) {
      setBoards(storeProjects)
    }
  }, [storeProjects])

  // Fetch data AFTER UI renders (non-blocking)
  useEffect(() => { 
    const hasData = storeProjects && storeProjects.length > 0
    const timer = setTimeout(() => fetchBoards(hasData), 0)
    return () => clearTimeout(timer)
  }, [])

  // Fetch team leaders for board creation
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTeamLeaders()
    }
  }, [user])

  // If a board is selected, show the BoardView for that board
  const mainContent = (
    <PageWrapper
      title="Boards"
      actions={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => { setBulkMode(!bulkMode); setSelectedBoardIds([]) }}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: bulkMode ? '#F3E8FF' : '#FFFFFF',
                  border: bulkMode ? '1px solid #C084FC' : '1px solid #E5E7EB', borderRadius: 8,
                  color: bulkMode ? '#7E22CE' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <CheckSquare size={14} />
                <span className="hidden sm:inline">{bulkMode ? 'Cancel Bulk' : 'Select'}</span>
              </button>
              <button
                onClick={() => { setShowCreate(true); fetchTeamLeaders() }}
                className="px-2.5 py-1.5 sm:px-4 sm:py-2"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #4A1F6F 0%, #3B1859 100%)',
                  border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(74,31,111,0.25)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Plus size={14} /> <span className="hidden sm:inline">Add</span>
              </button>
            </>
          )}
        </div>
      }
    >
      <div style={{ flex: 1, overflow: 'auto' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#4A1F6F', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#6B7280', fontSize: 14 }}>Loading boards...</p>
            </div>
          ) : boards.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 16, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(74,31,111,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layout size={36} color="#4A1F6F" />
              </div>
              <h3 style={{ color: '#111827', fontSize: 20, fontWeight: 700, margin: 0 }}>No boards yet</h3>
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0, maxWidth: 360 }}>
                Create your first board to start organising tasks with Kanban columns
              </p>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', background: 'linear-gradient(135deg, #4A1F6F 0%, #3B1859 100%)',
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  marginTop: 8,
                  boxShadow: '0 4px 12px rgba(74,31,111,0.25)',
                }}
              >
                <Plus size={16} /> Create Your First Board
              </button>
            </div>
          ) : (
            <>
              {bulkMode && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', marginBottom: 16, background: 'rgba(74,31,111,0.06)', border: '1px solid rgba(74,31,111,0.2)', borderRadius: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4A1F6F' }}>{selectedBoardIds.length} boards selected</span>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                    <button
                      onClick={() => {
                        if (selectedBoardIds.length === boards.length) setSelectedBoardIds([])
                        else setSelectedBoardIds(boards.map(b => b.id))
                      }}
                      style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 6, cursor: 'pointer' }}
                    >
                      {selectedBoardIds.length === boards.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selectedBoardIds.length > 0 && (
                      <button
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, background: '#EF4444', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Trash2 size={13} /> Delete Selected ({selectedBoardIds.length})
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {boards.map((board, i) => {
                const colors = [
                  'linear-gradient(135deg, #4A1F6F 0%, #6B2D8E 100%)',
                  'linear-gradient(135deg, #4A1F6F 0%, #D9A441 100%)',
                  'linear-gradient(135deg, #2D0F47 0%, #4A1F6F 100%)',
                  'linear-gradient(135deg, #8B3DB5 0%, #D9A441 100%)',
                  'linear-gradient(135deg, #4A1F6F 0%, #8B3DB5 100%)',
                  'linear-gradient(135deg, #2D0F47 0%, #D9A441 100%)',
                  'linear-gradient(135deg, #5E2780 0%, #4A1F6F 100%)',
                  'linear-gradient(135deg, #7C3AA7 0%, #D9A441 100%)'
                ]
                const color = colors[i % colors.length]
                const isSelected = selectedBoardIds.includes(board.id)
                return (
                  <div
                    key={board.id}
                    onClick={() => {
                      if (bulkMode) {
                        setSelectedBoardIds(prev => prev.includes(board.id) ? prev.filter(id => id !== board.id) : [...prev, board.id])
                      } else {
                        setSelectedBoardId(board.id)
                      }
                    }}
                    style={{
                      background: '#FFFFFF', border: isSelected && bulkMode ? '2px solid #4A1F6F' : '1px solid #E5E7EB',
                      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      textAlign: 'left', padding: 0, position: 'relative',
                      transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                      boxShadow: isSelected && bulkMode ? '0 4px 14px rgba(74,31,111,0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    onMouseEnter={e => {
                      if (!bulkMode) {
                        e.currentTarget.style.transform = 'translateY(-3px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(74,31,111,0.12)'
                        e.currentTarget.style.borderColor = '#4A1F6F'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!bulkMode) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                        e.currentTarget.style.borderColor = '#E5E7EB'
                      }
                    }}
                  >
                    {/* Colour strip */}
                    <div style={{ height: 80, background: color, position: 'relative', overflow: 'hidden' }}>
                      {/* Bulk Checkbox Overlay */}
                      {bulkMode && (
                        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: '#FFFFFF', borderRadius: 6, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                          {isSelected ? <CheckSquare size={18} color="#4A1F6F" /> : <Square size={18} color="#9CA3AF" />}
                        </div>
                      )}
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
                      <p style={{ color: '#111827', fontSize: 14, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-plus-jakarta), sans-serif' }}>
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
                  </div>
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
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4A1F6F'; e.currentTarget.style.background = 'rgba(74,31,111,0.02)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = '#F9FAFB' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(74,31,111,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color="#4A1F6F" />
                </div>
                <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 600 }}>Create new board</span>
              </button>
              </div>
            </>
          )}
        </div>

      {/* Bulk Delete Confirm Modal */}
      {showBulkDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ color: '#111827', fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>Delete Selected Boards?</h3>
            <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to delete {selectedBoardIds.length} board(s)? This will permanently remove all tasks and data inside them.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                style={{ flex: 1, padding: '10px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deletingBulk}
                style={{ flex: 1, padding: '10px', background: '#EF4444', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: deletingBulk ? 0.6 : 1 }}
              >
                {deletingBulk ? 'Deleting...' : 'Delete Boards'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#4A1F6F'
                e.target.style.boxShadow = '0 0 0 3px rgba(74,31,111,0.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
                e.target.style.boxShadow = 'none'
              }}
            />
            {user?.role === 'admin' && (
              <>
                <label style={{ display: 'block', color: '#374151', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Team Leader (Optional)</label>
                <select
                  value={selectedTeamLeader}
                  onChange={e => setSelectedTeamLeader(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 14px', border: '1px solid #E5E7EB',
                    borderRadius: 8, fontSize: 14, color: '#111827',
                    outline: 'none', marginBottom: 20,
                    background: '#FFFFFF',
                    transition: 'all 0.2s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#4A1F6F'
                    e.target.style.boxShadow = '0 0 0 3px rgba(74,31,111,0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <option value="">None</option>
                  {teamLeaders.map(tl => (
                    <option key={tl.id} value={tl.id}>{tl.name}</option>
                  ))}
                </select>
              </>
            )}
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
                  flex: 1, padding: '10px', background: 'linear-gradient(135deg, #4A1F6F 0%, #3B1859 100%)', border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: newBoardName.trim() ? 'pointer' : 'not-allowed',
                  opacity: newBoardName.trim() ? 1 : 0.5,
                  boxShadow: newBoardName.trim() ? '0 2px 8px rgba(74,31,111,0.25)' : 'none',
                }}
              >
                {creatingBoard ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )

  if (selectedBoardId) {
    return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh' }}>
      <BoardView projectId={PROJECT_ID} initialBoardId={selectedBoardId} onBack={() => setSelectedBoardId(null)} />
    </div>
  }

  return mainContent
}
