'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, RefreshCw, LayoutGrid, CheckCircle2, Menu } from 'lucide-react'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { BoardView } from '@/components/board/BoardView'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'

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

/* ─── Task Row — defined OUTSIDE parent so hooks are stable ─── */
function TaskRow({ 
  task, 
  idx,
  totalTasks,
  onTaskClick, 
  onComplete 
}: { 
  task: Task
  idx: number
  totalTasks: number
  onTaskClick: () => void
  onComplete: () => void
}) {
  const p = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div
      onClick={onTaskClick}
      className="task-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 180px 180px',
        gap: 16,
        padding: '14px 20px',
        borderBottom: idx < totalTasks - 1 ? '1px solid #F3F4F6' : 'none',
        cursor: 'pointer',
        transition: 'background 0.15s',
        alignItems: 'center',
      }}
    >
      {/* Complete Button */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {task.status !== 'done' && (
          <button
            onClick={onComplete}
            title="Mark as Done"
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#F0FDF4', border: '1.5px solid #22C55E',
              color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#DCFCE7'
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#F0FDF4'
              e.currentTarget.style.transform = 'none'
            }}
          >
            ✓
          </button>
        )}
      </div>

      {/* Name with Board Badge and Labels */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </div>
        {task.board?.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                background: '#F3F4F6',
                color: '#6B7280',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 140,
              }}
            >
              📋 {task.board.name}
            </span>
            {/* Labels */}
            {task.labels && task.labels.length > 0 && task.labels.slice(0, 2).map((lbl: any, labelIdx: number) => (
              <span
                key={labelIdx}
                style={{
                  backgroundColor: lbl.color || '#E2B203',
                  color: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              >
                {lbl.name || 'LABEL'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Priority Badge */}
      <div>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 20,
          background: p.bg,
          color: '#FFFFFF',
          textTransform: 'uppercase',
          letterSpacing: '.5px'
        }}>
          {p.label}
        </span>
      </div>

      {/* Due Date */}
      <div>
        {task.due_date ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Clock size={14} color={isOverdue ? '#EF4444' : '#6B7280'} />
            <span style={{ fontSize: 13, color: isOverdue ? '#EF4444' : '#111827', fontWeight: isOverdue ? 600 : 500 }}>
              {new Date(task.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {isOverdue && (
              <span style={{
                padding: '1px 5px',
                background: '#FEE2E2',
                color: '#EF4444',
                borderRadius: 3,
                fontSize: 9,
                fontWeight: 700
              }}>
                OVERDUE
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No due date</span>
        )}
      </div>
    </div>
  )
}

/* ─── Page ─── */
export default function MyTasksPage() {
  const storeTasks = usePrefetchStore((state) => state.myTasks)
  const prefetchStatus = usePrefetchStore((state) => state.status)

  const tasks = (storeTasks || []).filter((t: any) => t.status === 'todo' || t.status === 'in_progress')
  const loading = prefetchStatus.tasks === 'loading' && tasks.length === 0

  const [refreshing, setRefreshing] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [projectId] = useState('c691dc11-b522-4e80-8ae6-337244d2a28d')
  const [showKanban, setShowKanban] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(undefined)
  const [activeFilter, setActiveFilter] = useState<'all' | 'todo' | 'in_progress'>('all')
  
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

  const refreshTasks = async () => {
    setRefreshing(true)
    try {
      await usePrefetchStore.getState().refreshChunk('tasks')
    } catch {}
    finally { setRefreshing(false) }
  }

  useEffect(() => { 
    const store = usePrefetchStore.getState()
    if (!store.isPrefetched) {
      store.prefetchAll().catch(console.error)
    }
    fetchBoards()
  }, [])
  
  useEffect(() => {
    if (tasks.length > 0) {
      extractBoardsFromTasks()
    }
  }, [tasks])

  const completeTask = async (taskId: string) => {
    // Optimistic Update: instantly remove from UI
    usePrefetchStore.getState().removeTask(taskId)
    
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (!res.ok) {
        usePrefetchStore.getState().refreshChunk('tasks')
      }
    } catch {
      usePrefetchStore.getState().refreshChunk('tasks')
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100vh' }}>
        <BoardView 
          projectId={projectId} 
          initialBoardId={selectedBoardId}
          onBack={() => {
            setShowKanban(false)
            setSelectedBoardId(undefined)
          }}
        />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .task-row:hover {
          background: #F9FAFB !important;
        }
        .tab-btn { padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh', background: '#F8F9FA', fontFamily: 'var(--font-inter), sans-serif' }}>
          {/* Header */}
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '16px 28px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => useSidebarStore.getState().setOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                  <Menu size={18} />
                </button>
                <div>
                  <h1 style={{ color: '#111827', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-.3px', fontFamily: 'var(--font-plus-jakarta), sans-serif' }}>My Tasks</h1>
                  <p style={{ color: '#6B7280', fontSize: 13, margin: '3px 0 0' }}>Tasks assigned to you</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={refreshTasks}
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
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              {/* Table Header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 1fr 180px 180px', 
                gap: 16, 
                padding: '14px 20px', 
                background: '#F9FAFB', 
                borderBottom: '1px solid #E5E7EB',
                fontSize: 11,
                fontWeight: 700,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '.5px'
              }}>
                <div></div>
                <div>Name</div>
                <div>Priority</div>
                <div>Due Date</div>
              </div>

              <div>
                {/* To Do Section */}
                {filtered.filter(t => t.status === 'todo').length > 0 && (
                  <>
                    <div style={{
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '10px 20px',
                      borderBottom: '1px solid #BFDBFE',
                      textTransform: 'uppercase',
                      letterSpacing: '.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />
                      To Do ({filtered.filter(t => t.status === 'todo').length})
                    </div>
                    {filtered.filter(t => t.status === 'todo').map((task, idx, arr) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        idx={idx}
                        totalTasks={arr.length}
                        onTaskClick={() => setSelectedTask(task)}
                        onComplete={() => completeTask(task.id)}
                      />
                    ))}
                  </>
                )}

                {/* In Progress Section */}
                {filtered.filter(t => t.status === 'in_progress').length > 0 && (
                  <>
                    <div style={{
                      background: '#FFFBEB',
                      color: '#B45309',
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '10px 20px',
                      borderBottom: '1px solid #FCD34D',
                      textTransform: 'uppercase',
                      letterSpacing: '.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: filtered.filter(t => t.status === 'todo').length > 0 ? 12 : 0
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                      In Progress ({filtered.filter(t => t.status === 'in_progress').length})
                    </div>
                    {filtered.filter(t => t.status === 'in_progress').map((task, idx, arr) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        idx={idx}
                        totalTasks={arr.length}
                        onTaskClick={() => setSelectedTask(task)}
                        onComplete={() => completeTask(task.id)}
                      />
                    ))}
                  </>
                )}

                {filtered.filter(t => t.status === 'todo').length === 0 && filtered.filter(t => t.status === 'in_progress').length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                    No active tasks in these statuses.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={{ ...selectedTask, list_id: selectedTask.list_id ?? '' } as any}
          onClose={() => setSelectedTask(null)}
          onUpdate={refreshTasks}
          boardId={selectedTask.list_id || ''}
          projectId={projectId}
        />
      )}
    </>
  )
}
