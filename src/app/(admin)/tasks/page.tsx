'use client'

import { useEffect, useState } from 'react'
import { Clock, RefreshCw, LayoutGrid, CheckCircle2 } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { BoardView } from '@/components/board/BoardView'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  assigned_to_name?: string
  assigned_to_email?: string
  due_date?: string
  created_at: string
  list_id?: string
  position?: number
  assigned_user?: { id: string; name: string; email: string }
  labels?: any[]
  board?: { id: string; name: string }
  board_id?: string
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

/* ─── Task Card ─── */
function TaskCard({ task, onClick, onComplete }: { task: Task; onClick: () => void; onComplete?: () => void }) {
  const p = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
  const s = STATUS_LABEL[task.status] ?? STATUS_LABEL.todo
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const assigneeName = task.assigned_user?.name || task.assigned_to_name

  return (
    <div
      onClick={onClick}
      className="task-card"
      style={{ '--glow': p.glow, '--accent': p.accent } as React.CSSProperties}
    >
      {/* top accent stripe */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${p.bg},transparent)`, borderRadius: '12px 12px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />

      {/* board name badge */}
      {task.board?.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
            background: '#EFF6FF', color: '#3B82F6',
            border: '1px solid #BFDBFE',
            letterSpacing: '.4px', textTransform: 'uppercase',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
          }}>
            📋 {task.board.name}
          </span>
        </div>
      )}

      {/* priority + status badges */}
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

      {/* labels */}
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
                fontSize: 8, 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '.3px' 
              }}
            >
              {lbl.name || 'NO LABEL'}
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

        {assigneeName && (
          <div
            title={assigneeName}
            style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}
          >
            {assigneeName.charAt(0).toUpperCase()}
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

type FilterKey = 'all' | 'todo' | 'in_progress' | 'done' | 'blocked'

/* ─── Page ─── */
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [projectId] = useState('c691dc11-b522-4e80-8ae6-337244d2a28d')
  const [showKanban, setShowKanban] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  
  // New filter states
  const [filterBoards, setFilterBoards] = useState<Set<string>>(new Set())
  const [filterMembers, setFilterMembers] = useState<Set<string>>(new Set())
  const [filterDueDate, setFilterDueDate] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [boards, setBoards] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const fetchTasks = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/tasks/my-tasks`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(data.data?.tasks || [])
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }
  
  const fetchBoards = async () => {
    try {
      console.log('Fetching boards for project:', projectId)
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/boards/project/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      })
      console.log('Boards response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('Boards data:', data)
        setBoards(data.data?.boards || [])
      } else {
        console.error('Failed to fetch boards, status:', res.status, await res.text())
        // Fallback to extracting from tasks if API fails
        if (tasks.length > 0) {
          extractBoardsFromTasks()
        }
      }
    } catch (err) {
      console.error('Error fetching boards:', err)
      // Fallback to extracting from tasks if error
      if (tasks.length > 0) {
        extractBoardsFromTasks()
      }
    }
  }
  
  // Alternative: Extract boards from tasks if API call fails
  const extractBoardsFromTasks = () => {
    const uniqueBoards = new Map()
    tasks.forEach(task => {
      if (task.board && task.board.id) {
        if (!uniqueBoards.has(task.board.id)) {
          uniqueBoards.set(task.board.id, task.board)
        }
      } else if (task.board_id) {
        // If board object doesn't exist, create one from board_id
        if (!uniqueBoards.has(task.board_id)) {
          uniqueBoards.set(task.board_id, {
            id: task.board_id,
            name: 'Board ' + task.board_id.substring(0, 8)
          })
        }
      }
    })
    const boardsArray = Array.from(uniqueBoards.values())
    console.log('Extracted boards from tasks:', boardsArray)
    if (boardsArray.length > 0 && boards.length === 0) {
      setBoards(boardsArray)
    }
  }
  
  const fetchUsers = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data?.users || [])
      }
    } catch {}
  }
  
  useEffect(() => { 
    fetchTasks()
    fetchBoards()
    fetchUsers()
  }, [])
  
  // Extract boards from tasks as fallback
  useEffect(() => {
    if (tasks.length > 0) {
      extractBoardsFromTasks()
    }
  }, [tasks])

  const completeTask = async (taskId: string) => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'done' }),
      })
      if (res.ok) {
        // Optimistically update status in local state
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t))
      }
    } catch {}
  }

  // Apply all filters
  const filteredTasks = tasks.filter(task => {
    // Status filter
    if (activeFilter !== 'all' && task.status !== activeFilter) return false
    
    // Board filter
    if (filterBoards.size > 0 && !filterBoards.has(task.board_id || '')) return false
    
    // Member filter
    if (filterMembers.size > 0) {
      const assignedId = task.assigned_user?.id || task.assigned_to
      if (!assignedId || !filterMembers.has(assignedId)) return false
    }
    
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

  const filtered = filteredTasks

  const counts: Record<FilterKey, number> = {
    all:         filteredTasks.length,
    todo:        filteredTasks.filter(t => t.status === 'todo').length,
    in_progress: filteredTasks.filter(t => t.status === 'in_progress').length,
    done:        filteredTasks.filter(t => t.status === 'done').length,
    blocked:     filteredTasks.filter(t => t.status === 'blocked').length,
  }
  
  const activeFiltersCount = filterBoards.size + filterMembers.size + filterDueDate.size
  
  const clearAllFilters = () => {
    setFilterBoards(new Set())
    setFilterMembers(new Set())
    setFilterDueDate(new Set())
  }

  const TABS: { key: FilterKey; label: string; color: string }[] = [
    { key: 'all',         label: 'All Tasks',   color: '#6B7280' },
    { key: 'todo',        label: 'To Do',        color: '#3B82F6' },
    { key: 'in_progress', label: 'In Progress',  color: '#F59E0B' },
    { key: 'done',        label: 'Done',         color: '#10B981' },
    { key: 'blocked',     label: 'Blocked',      color: '#EF4444' },
  ]

  if (showKanban) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#F8F9FA' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Removed extra header - BoardView has its own header with back button */}
          <BoardView projectId={projectId} />
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
        .tab-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
        }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', background: '#F8F9FA', fontFamily: 'system-ui,sans-serif' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '16px 28px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ color: '#111827', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-.3px' }}>All Tasks</h1>
                <p style={{ color: '#6B7280', fontSize: 13, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Tasks across all boards · {tasks.length} total
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => fetchTasks(true)}
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
                    {/* Filter icon placeholder */}
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
                          
                          {/* Assigned Filter */}
                          <div style={{ padding: '8px 16px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                              Assigned To
                            </div>
                            {users.slice(0, 10).map((user, idx) => (
                              <label 
                                key={user.id}
                                style={{ 
                                  display: 'flex', alignItems: 'center', gap: 10, 
                                  padding: '6px 0', cursor: 'pointer' 
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={filterMembers.has(user.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(filterMembers)
                                    if (e.target.checked) newSet.add(user.id)
                                    else newSet.delete(user.id)
                                    setFilterMembers(newSet)
                                  }}
                                  style={{ accentColor: '#3B82F6', cursor: 'pointer' }}
                                />
                                <div
                                  style={{ 
                                    width: 24, height: 24, borderRadius: '50%', 
                                    background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', 
                                    color: '#fff', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', fontSize: 11, fontWeight: 700 
                                  }}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontSize: 13, color: '#111827' }}>{user.name}</span>
                              </label>
                            ))}
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
                  Open Board
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              {TABS.map(tab => {
                const active = activeFilter === tab.key
                return (
                  <button
                    key={tab.key}
                    className="tab-btn"
                    onClick={() => setActiveFilter(tab.key)}
                    style={{
                      background: active ? `${tab.key === 'all' ? '#F3F4F6' : tab.key === 'todo' ? '#EFF6FF' : tab.key === 'in_progress' ? '#FEF3C7' : tab.key === 'done' ? '#D1FAE5' : '#FEE2E2'}` : 'transparent',
                      color: active ? tab.color : '#6B7280',
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {tab.label}
                    <span style={{
                      padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: active ? `${tab.key === 'all' ? '#E5E7EB' : tab.key === 'todo' ? '#DBEAFE' : tab.key === 'in_progress' ? '#FDE68A' : tab.key === 'done' ? '#A7F3D0' : '#FECACA'}` : '#F3F4F6',
                      color: active ? tab.color : '#9CA3AF',
                    }}>
                      {counts[tab.key]}
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
                <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Loading all tasks…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 14, textAlign: 'center' }}>
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={34} color="#3B82F6" />
                </div>
                <h3 style={{ color: '#111827', fontSize: 20, fontWeight: 700, margin: 0 }}>No tasks found</h3>
                <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Try adjusting your filters or create a new task</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {filtered.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                    onComplete={() => completeTask(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={{ ...selectedTask, list_id: selectedTask.list_id ?? '' } as any}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => fetchTasks(true)}
          boardId={selectedTask.board_id || ''}
          projectId={projectId}
        />
      )}
    </>
  )
}
