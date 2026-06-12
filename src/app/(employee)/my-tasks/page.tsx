'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, RefreshCw, LayoutGrid, CheckCircle2, Menu } from 'lucide-react'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { BoardView } from '@/components/board/BoardView'
import { Sidebar } from '@/components/layout/Sidebar'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  list_id?: string
  position?: number
  assigned_user?: { id: string; name: string; email: string }
  labels?: any[]
  board?: { id: string; name: string }
}

const PRIORITY_CONFIG: Record<string, { bg: string; glow: string; label: string; accent: string }> = {
  low:    { bg: '#94C748', glow: '148,199,72',  label: 'LOW',    accent: '#94C748' },
  medium: { bg: '#E2B203', glow: '226,178,3',   label: 'MEDIUM', accent: '#E2B203' },
  high:   { bg: '#FEA362', glow: '254,163,98',  label: 'HIGH',   accent: '#FEA362' },
  urgent: { bg: '#F87168', glow: '248,113,104', label: 'URGENT', accent: '#F87168' },
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  todo:        { text: 'To Do',       color: '#579DFF' },
  in_progress: { text: 'In Progress', color: '#E2B203' },
  done:        { text: 'Done',        color: '#94C748' },
  blocked:     { text: 'Blocked',     color: '#F87168' },
}

/* ─── Task Card — defined OUTSIDE parent so hooks are stable ─── */
function TaskCard({ 
  task, 
  onClick, 
  onComplete, 
  onBoardClick 
}: { 
  task: Task; 
  onClick: () => void; 
  onComplete?: () => void;
  onBoardClick?: (boardId: string) => void;
}) {
  const p = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
  const s = STATUS_LABEL[task.status] ?? STATUS_LABEL.todo
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()

  return (
    <div
      onClick={onClick}
      className="task-card"
      style={{ '--glow': p.glow, '--accent': p.accent } as React.CSSProperties}
    >
      {/* top accent stripe */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${p.bg},transparent)`, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />

      {/* badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: '.8px', background: p.bg, color: '#FFFFFF', textTransform: 'uppercase' }}>
          {p.label}
        </span>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: '#F3F4F6', color: s.color }}>
          {s.text}
        </span>
      </div>

      {/* title */}
      <h4 style={{ color: '#111827', fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.4, flexShrink: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {task.title}
      </h4>
      {/* Board badge - clickable */}
      {task.board?.name && (
        <span 
          onClick={(e) => {
            e.stopPropagation()
            if (task.board?.id && onBoardClick) {
              onBoardClick(task.board.id)
            }
          }}
          style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
            background: '#EFF6FF', color: '#3B82F6',
            border: '1px solid #BFDBFE',
            letterSpacing: '.4px', textTransform: 'uppercase',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#DBEAFE'
            e.currentTarget.style.borderColor = '#93C5FD'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#EFF6FF'
            e.currentTarget.style.borderColor = '#BFDBFE'
          }}
          title={`Go to ${task.board.name} board`}
        >
          📋 {task.board.name}
        </span>
      )}

      {/* Dynamic labels - display using actual label color and name */}
      {task.labels && task.labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
          {task.labels.map((lbl: any, idx: number) => (
            <span
              key={idx}
              style={{ 
                backgroundColor: lbl.color || '#E2B203', 
                color: '#FFFFFF', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontSize: 9, 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '.4px' 
              }}
              title={lbl.name || 'Unnamed Label'}
            >
              {lbl.name || 'LABEL'}
            </span>
          ))}
        </div>
      )}

      {/* description */}
      {task.description ? (
        <p style={{ color: '#6B7280', fontSize: 11.5, margin: 0, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flexGrow: 1 }}
          dangerouslySetInnerHTML={{ __html: task.description.replace(/<[^>]+>/g, '').slice(0, 90) }}
        />
      ) : (
        <div style={{ flexGrow: 1 }} />
      )}

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', flexShrink: 0, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
        {task.due_date ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: isOverdue ? '#EF4444' : '#6B7280', fontSize: 11 }}>
            <Clock size={11} />
            <span style={{ fontWeight: 600 }}>
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {isOverdue && (
              <span style={{ padding: '1px 5px', background: '#EF4444', color: '#fff', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>OVERDUE</span>
            )}
          </div>
        ) : <div />}

        {task.assigned_user && (
          <div
            title={task.assigned_user.name}
            style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}
          >
            {task.assigned_user.name.charAt(0).toUpperCase()}
          </div>
        )}

        {task.status !== 'done' && onComplete && (
          <button
            onClick={e => { e.stopPropagation(); onComplete() }}
            title="Mark as Done"
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: '#F0FDF4', border: '1.5px solid #22C55E',
              color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#DCFCE7')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F0FDF4')}
          >
            ✓
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Page ─── */
export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [projectId] = useState('c691dc11-b522-4e80-8ae6-337244d2a28d')
  const [showKanban, setShowKanban] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(undefined)
  const [activeFilter, setActiveFilter] = useState<'all' | 'todo' | 'in_progress'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Filter states
  const [filterBoards, setFilterBoards] = useState<Set<string>>(new Set())
  const [filterDueDate, setFilterDueDate] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [boards, setBoards] = useState<any[]>([])

  const token = () => localStorage.getItem('authToken')
  
  const fetchBoards = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/boards/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setBoards(data.data?.boards || [])
      }
    } catch (err) {
      console.error('Error fetching boards:', err)
    }
  }
  
  const extractBoardsFromTasks = () => {
    const uniqueBoards = new Map()
    tasks.forEach(task => {
      if (task.board && task.board.id) {
        if (!uniqueBoards.has(task.board.id)) {
          uniqueBoards.set(task.board.id, task.board)
        }
      }
    })
    const boardsArray = Array.from(uniqueBoards.values())
    if (boardsArray.length > 0 && boards.length === 0) {
      setBoards(boardsArray)
    }
  }

  const fetchMyTasks = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/tasks/my-tasks`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (res.ok) {
        const data = await res.json()
        const all = data.data?.tasks || []
        setTasks(all.filter((t: Task) => t.status === 'todo' || t.status === 'in_progress'))
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { 
    fetchMyTasks()
    fetchBoards()
  }, [])
  
  useEffect(() => {
    if (tasks.length > 0) {
      extractBoardsFromTasks()
    }
  }, [tasks])

  const completeTask = async (taskId: string) => {
    // Optimistic Update: instantly remove from UI
    setTasks(prev => prev.filter(t => t.id !== taskId))
    
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (!res.ok) {
        // Revert on failure
        fetchMyTasks(true)
      }
    } catch {
      fetchMyTasks(true)
    }
  }

  // Apply filters
  const filteredByFilters = tasks.filter(task => {
    // Board filter
    if (filterBoards.size > 0 && !filterBoards.has(task.board?.id || '')) return false
    
    // Due date filter
    if (filterDueDate.size > 0) {
      let matchesDue = false
      if (!task.due_date && filterDueDate.has('No due date')) matchesDue = true
      else if (task.due_date) {
        const due = new Date(task.due_date)
        const now = new Date()
        if (filterDueDate.has('Overdue') && due < now && task.status !== 'done') matchesDue = true
        
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (filterDueDate.has('Due next day') && due.toDateString() === tomorrow.toDateString()) matchesDue = true
        
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)
        if (filterDueDate.has('Due next week') && due <= nextWeek && due >= now) matchesDue = true
      }
      if (!matchesDue) return false
    }
    
    return true
  })

  const filtered = filteredByFilters.filter(t => activeFilter === 'all' || t.status === activeFilter)
  const todoCount = filteredByFilters.filter(t => t.status === 'todo').length
  const inProgressCount = filteredByFilters.filter(t => t.status === 'in_progress').length
  
  const activeFiltersCount = filterBoards.size + filterDueDate.size
  
  const clearAllFilters = () => {
    setFilterBoards(new Set())
    setFilterDueDate(new Set())
  }

  if (showKanban) {
    return (
      <div style={{ height: '100vh', display: 'flex', background: '#F8F9FA', fontFamily: 'system-ui,sans-serif' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <BoardView 
            projectId={projectId} 
            initialBoardId={selectedBoardId}
            onBack={() => {
              setShowKanban(false)
              setSelectedBoardId(undefined)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .task-card {
          position: relative;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .task-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
          border-color: #3B82F6;
        }
        .tab-btn { padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', background: '#F8F9FA', fontFamily: 'system-ui,sans-serif' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '16px 28px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                  <Menu size={18} />
                </button>
                <div>
                  <h1 style={{ color: '#111827', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-.3px' }}>My Tasks</h1>
                  <p style={{ color: '#6B7280', fontSize: 13, margin: '3px 0 0' }}>Tasks assigned to you</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => fetchMyTasks(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                  Refresh
                </button>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', 
                      background: activeFiltersCount > 0 ? '#EFF6FF' : '#FFFFFF', 
                      border: `1px solid ${activeFiltersCount > 0 ? '#3B82F6' : '#E5E7EB'}`, 
                      borderRadius: 8, 
                      color: activeFiltersCount > 0 ? '#3B82F6' : '#374151', 
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      position: 'relative'
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Filter
                    {activeFiltersCount > 0 && (
                      <span style={{ 
                        position: 'absolute', top: -6, right: -6, 
                        background: '#3B82F6', color: '#fff', 
                        borderRadius: '50%', width: 18, height: 18, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: 10, fontWeight: 700 
                      }}>
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                  {showFilters && (
                    <>
                      <div 
                        style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                        onClick={() => setShowFilters(false)}
                      />
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: 8,
                        width: 300, background: '#FFFFFF', border: '1px solid #E5E7EB',
                        borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000,
                        maxHeight: 'calc(100vh - 200px)', overflowY: 'auto'
                      }}>
                        <div style={{ 
                          padding: '12px 16px', borderBottom: '1px solid #E5E7EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1
                        }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Filter Tasks</h3>
                          {activeFiltersCount > 0 && (
                            <button
                              onClick={clearAllFilters}
                              style={{ 
                                fontSize: 11, color: '#3B82F6', background: 'transparent', 
                                border: 'none', cursor: 'pointer', fontWeight: 600 
                              }}
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        
                        <div style={{ padding: '8px 0' }}>
                          {/* Board Filter */}
                          <div style={{ padding: '8px 16px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                              By Board
                            </div>
                            {boards.length === 0 ? (
                              <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', padding: '8px 0' }}>
                                Loading boards...
                              </div>
                            ) : (
                              boards.map(board => (
                                <label 
                                  key={board.id}
                                  style={{ 
                                    display: 'flex', alignItems: 'center', gap: 10, 
                                    padding: '6px 0', cursor: 'pointer' 
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={filterBoards.has(board.id)}
                                    onChange={(e) => {
                                      const newSet = new Set(filterBoards)
                                      if (e.target.checked) newSet.add(board.id)
                                      else newSet.delete(board.id)
                                      setFilterBoards(newSet)
                                    }}
                                    style={{ accentColor: '#3B82F6', cursor: 'pointer' }}
                                  />
                                  <span style={{ fontSize: 13, color: '#111827' }}>{board.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                          
                          <div style={{ height: 1, background: '#E5E7EB', margin: '8px 0' }} />
                          
                          {/* Due Date Filter */}
                          <div style={{ padding: '8px 16px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                              Due Date
                            </div>
                            {['Overdue', 'Due next day', 'Due next week', 'No due date'].map(option => (
                              <label 
                                key={option}
                                style={{ 
                                  display: 'flex', alignItems: 'center', gap: 10, 
                                  padding: '6px 0', cursor: 'pointer' 
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={filterDueDate.has(option)}
                                  onChange={(e) => {
                                    const newSet = new Set(filterDueDate)
                                    if (e.target.checked) newSet.add(option)
                                    else newSet.delete(option)
                                    setFilterDueDate(newSet)
                                  }}
                                  style={{ accentColor: '#3B82F6', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: 13, color: '#111827' }}>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowKanban(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', background: '#111827', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
                >
                  <LayoutGrid size={13} />
                  Board View
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              {[
                { key: 'all', label: 'All', count: tasks.length },
                { key: 'todo', label: 'To Do', count: todoCount },
                { key: 'in_progress', label: 'In Progress', count: inProgressCount },
              ].map(tab => {
                const active = activeFilter === tab.key
                return (
                  <button
                    key={tab.key}
                    className="tab-btn"
                    onClick={() => setActiveFilter(tab.key as any)}
                    style={{ background: active ? '#EFF6FF' : 'transparent', color: active ? '#3B82F6' : '#6B7280', fontWeight: active ? 700 : 500 }}
                  >
                    {tab.label}
                    <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: active ? '#DBEAFE' : '#F3F4F6', color: active ? '#3B82F6' : '#9CA3AF' }}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Loading tasks…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 14, textAlign: 'center' }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={34} color="#3B82F6" />
              </div>
              <h3 style={{ color: '#111827', fontSize: 20, fontWeight: 700, margin: 0 }}>No tasks here</h3>
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Tasks assigned to you will appear here</p>
            </div>
          ) : (
            <div>
              {/* Group tasks by board */}
              {(() => {
                const tasksByBoard = new Map<string, {board: any, tasks: Task[]}>()
                filtered.forEach(task => {
                  const boardId = task.board?.id || 'no-board'
                  const boardName = task.board?.name || 'No Board'
                  if (!tasksByBoard.has(boardId)) {
                    tasksByBoard.set(boardId, { board: { id: boardId, name: boardName }, tasks: [] })
                  }
                  tasksByBoard.get(boardId)!.tasks.push(task)
                })
                
                return Array.from(tasksByBoard.values()).map(({board, tasks}) => (
                  <div key={board.id} style={{ marginBottom: 32 }}>
                    {/* Board Header - Clickable */}
                    <div
                      onClick={() => {
                        if (board.id !== 'no-board') {
                          setSelectedBoardId(board.id)
                          setShowKanban(true)
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 16,
                        padding: '12px 16px',
                        background: board.id === 'no-board' ? '#F9FAFB' : '#EFF6FF',
                        borderRadius: 10,
                        border: `1px solid ${board.id === 'no-board' ? '#E5E7EB' : '#BFDBFE'}`,
                        cursor: board.id === 'no-board' ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (board.id !== 'no-board') {
                          e.currentTarget.style.background = '#DBEAFE'
                          e.currentTarget.style.borderColor = '#93C5FD'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (board.id !== 'no-board') {
                          e.currentTarget.style.background = '#EFF6FF'
                          e.currentTarget.style.borderColor = '#BFDBFE'
                        }
                      }}
                      title={board.id !== 'no-board' ? `Click to open ${board.name} board` : undefined}
                    >
                      <span style={{ fontSize: 20 }}>📋</span>
                      <h3 style={{ 
                        fontSize: 16, 
                        fontWeight: 700, 
                        color: board.id === 'no-board' ? '#6B7280' : '#1E40AF', 
                        margin: 0, 
                        flex: 1 
                      }}>
                        {board.name}
                      </h3>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: board.id === 'no-board' ? '#E5E7EB' : '#BFDBFE',
                        color: board.id === 'no-board' ? '#6B7280' : '#1E40AF',
                      }}>
                        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                      {board.id !== 'no-board' && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      )}
                    </div>
                    
                    {/* Tasks Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                      {tasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setSelectedTask(task)}
                          onComplete={() => completeTask(task.id)}
                          onBoardClick={(boardId) => {
                            setSelectedBoardId(boardId)
                            setShowKanban(true)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={{ ...selectedTask, list_id: selectedTask.list_id ?? '' } as any}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => fetchMyTasks(true)}
          boardId={selectedTask.list_id || ''}
          projectId={projectId}
        />
      )}
    </>
  )
}
