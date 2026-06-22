'use client'

import { useEffect, useState } from 'react'
import { Clock, RefreshCw, LayoutGrid, CheckCircle2, GripVertical, Filter } from 'lucide-react'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { BoardView } from '@/components/board/BoardView'
import Link from 'next/link'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Theme Palette ──────────────────────────────────────────────────────────────
const PURPLE = '#4A1F6F'
const PURPLE_DARK = '#2D0F47'
const GOLD = '#D9A441'
const PURPLE_10 = 'rgba(74,31,111,0.10)'
const PURPLE_5  = 'rgba(74,31,111,0.05)'
const PURPLE_20 = 'rgba(74,31,111,0.20)'

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

const PRIORITY_CONFIG: Record<string, { bg: string; label: string }> = {
  low:    { bg: '#22C55E', label: 'LOW'    },
  medium: { bg: '#F59E0B', label: 'MEDIUM' },
  high:   { bg: '#F97316', label: 'HIGH'   },
  urgent: { bg: '#EF4444', label: 'URGENT' },
}

const STATUS_CFG: Record<string, { text: string; dot: string; rowBg: string; rowBorder: string; rowText: string }> = {
  todo:        { text: 'To Do',       dot: PURPLE,    rowBg: PURPLE_5,             rowBorder: `${PURPLE}30`, rowText: PURPLE      },
  in_progress: { text: 'In Progress', dot: GOLD,      rowBg: 'rgba(217,164,65,.05)', rowBorder: `${GOLD}40`,  rowText: '#92650a'   },
  done:        { text: 'Done',        dot: '#22C55E', rowBg: '#F0FDF4',             rowBorder: '#BBF7D0',     rowText: '#15803D'   },
  blocked:     { text: 'Blocked',     dot: '#EF4444', rowBg: '#FEF2F2',             rowBorder: '#FECACA',     rowText: '#B91C1C'   },
}

/* ─── Sortable Task Row ─── */
function SortableTaskRow({
  task,
  idx,
  totalTasks,
  onTaskClick,
  onComplete,
}: {
  task: Task
  idx: number
  totalTasks: number
  onTaskClick: () => void
  onComplete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const p = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const assigneeName = task.assigned_user?.name || task.assigned_to_name

  return (
    <div ref={setNodeRef} style={style} onClick={onTaskClick} className="task-row">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 200px 180px',
        gap: 16,
        padding: '14px 20px',
        borderBottom: idx < totalTasks - 1 ? '1px solid #F3F4F6' : 'none',
        cursor: 'pointer',
        transition: 'background 0.15s',
        alignItems: 'center',
        background: isDragging ? PURPLE_5 : 'transparent',
      }}>
        {/* Drag Handle */}
        <div
          {...attributes} {...listeners}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} color="#9CA3AF" />
        </div>

        {/* Name + Board Badge */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </div>
          {task.board?.name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Link
                href={`/board/${task.board_id}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: PURPLE_5, color: PURPLE,
                  border: `1px solid ${PURPLE}20`,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
                  textDecoration: 'none', cursor: 'pointer',
                }}
              >
                📋 {task.board.name}
              </Link>
              {task.labels && task.labels.slice(0, 2).map((lbl: any, i: number) => (
                <span key={i} style={{ backgroundColor: lbl.color || GOLD, color: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                  {lbl.name || 'LABEL'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Assignee */}
        <div>
          {assigneeName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${PURPLE},${PURPLE_DARK})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {assigneeName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assigneeName}</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Unassigned</span>
          )}
        </div>

        {/* Due Date */}
        <div>
          {task.due_date ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Clock size={14} color={isOverdue ? '#EF4444' : '#6B7280'} />
              <span style={{ fontSize: 13, color: isOverdue ? '#EF4444' : '#111827', fontWeight: isOverdue ? 600 : 500 }}>
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {isOverdue && (
                <span style={{ padding: '1px 5px', background: '#FEE2E2', color: '#EF4444', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>OVERDUE</span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No due date</span>
          )}
        </div>
      </div>
    </div>
  )
}

type FilterKey = 'all' | 'todo' | 'in_progress' | 'done' | 'blocked'

/* ─── Page ─── */
export default function TasksPage() {
  const storeTasks = usePrefetchStore((state) => state.myTasks)
  const [tasks, setTasks] = useState<Task[]>(() => storeTasks && storeTasks.length > 0 ? storeTasks : [])
  const [loading, setLoading] = useState(() => !(storeTasks && storeTasks.length > 0))
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [projectId] = useState('c691dc11-b522-4e80-8ae6-337244d2a28d')
  const [showKanban, setShowKanban] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const [filterBoards, setFilterBoards] = useState<Set<string>>(new Set())
  const [filterMembers, setFilterMembers] = useState<Set<string>>(new Set())
  const [filterDueDate, setFilterDueDate] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [boards, setBoards] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
        const all = data.data?.tasks || []
        setTasks(all)
        usePrefetchStore.setState({ myTasks: all, status: { ...usePrefetchStore.getState().status, tasks: 'done' } })
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }

  const fetchBoards = async () => {
    const cachedBoards = usePrefetchStore.getState().projects
    if (cachedBoards && cachedBoards.length > 0) setBoards(cachedBoards)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/boards/project/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      })
      if (res.ok) {
        const data = await res.json()
        const fetchedBoards = data.data?.boards || []
        setBoards(fetchedBoards)
        usePrefetchStore.setState({ projects: fetchedBoards })
      } else if (tasks.length > 0) extractBoardsFromTasks()
    } catch { if (tasks.length > 0) extractBoardsFromTasks() }
  }

  const extractBoardsFromTasks = () => {
    const uniqueBoards = new Map()
    tasks.forEach(task => {
      if (task.board?.id && !uniqueBoards.has(task.board.id)) uniqueBoards.set(task.board.id, task.board)
      else if (task.board_id && !uniqueBoards.has(task.board_id)) uniqueBoards.set(task.board_id, { id: task.board_id, name: 'Board ' + task.board_id.substring(0, 8) })
    })
    const arr = Array.from(uniqueBoards.values())
    if (arr.length > 0 && boards.length === 0) setBoards(arr)
  }

  const fetchUsers = async () => {
    const cachedUsers = usePrefetchStore.getState().allUsers
    if (cachedUsers && cachedUsers.length > 0) setUsers(cachedUsers)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } })
      if (res.ok) {
        const data = await res.json()
        const fetchedUsers = data.data?.users || []
        setUsers(fetchedUsers)
        usePrefetchStore.setState({ allUsers: fetchedUsers })
      }
    } catch {}
  }

  useEffect(() => {
    if (storeTasks && storeTasks.length > 0) { setTasks(storeTasks); setLoading(false) }
  }, [storeTasks])

  useEffect(() => {
    const hasData = storeTasks && storeTasks.length > 0
    fetchTasks(hasData); fetchBoards(); fetchUsers()
  }, [])

  useEffect(() => { if (tasks.length > 0) extractBoardsFromTasks() }, [tasks])

  const completeTask = async (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t))
    usePrefetchStore.getState().updateTaskStatus(taskId, 'done')
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (!res.ok) fetchTasks(true)
    } catch { fetchTasks(true) }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setTasks((items) => {
        const newItems = arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id))
        usePrefetchStore.setState({ myTasks: newItems })
        updateTaskPositions(newItems)
        return newItems
      })
    }
  }

  const updateTaskPositions = async (reorderedTasks: Task[]) => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      await fetch(`${BACKEND_URL}/api/v1/tasks/reorder`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: reorderedTasks.map((t, i) => ({ id: t.id, position: (i + 1) * 1000 })) }),
      })
    } catch {}
  }

  const filteredTasks = tasks.filter(task => {
    if (activeFilter !== 'all' && task.status !== activeFilter) return false
    if (filterBoards.size > 0 && !filterBoards.has(task.board_id || '')) return false
    if (filterMembers.size > 0) {
      const assignedId = task.assigned_user?.id || task.assigned_to
      if (!assignedId || !filterMembers.has(assignedId)) return false
    }
    if (filterDueDate.size > 0) {
      let matchesDue = false
      if (!task.due_date && filterDueDate.has('No due date')) matchesDue = true
      else if (task.due_date) {
        const due = new Date(task.due_date), now = new Date()
        if (filterDueDate.has('Overdue') && due < now && task.status !== 'done') matchesDue = true
        const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
        if (filterDueDate.has('Due next day') && due.toDateString() === tomorrow.toDateString()) matchesDue = true
        const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7)
        if (filterDueDate.has('Due next week') && due <= nextWeek && due >= now) matchesDue = true
      }
      if (!matchesDue) return false
    }
    return true
  })

  const taskGroups = {
    todo:        filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    blocked:     filteredTasks.filter(t => t.status === 'blocked'),
    done:        filteredTasks.filter(t => t.status === 'done'),
  }

  const counts: Record<FilterKey, number> = {
    all:         filteredTasks.length,
    todo:        taskGroups.todo.length,
    in_progress: taskGroups.in_progress.length,
    done:        taskGroups.done.length,
    blocked:     taskGroups.blocked.length,
  }

  const activeFiltersCount = filterBoards.size + filterMembers.size + filterDueDate.size
  const clearAllFilters = () => { setFilterBoards(new Set()); setFilterMembers(new Set()); setFilterDueDate(new Set()) }

  const TABS: { key: FilterKey; label: string }[] = [
    { key: 'all',         label: 'All Tasks'   },
    { key: 'todo',        label: 'To Do'        },
    { key: 'in_progress', label: 'In Progress'  },
    { key: 'done',        label: 'Done'         },
    { key: 'blocked',     label: 'Blocked'      },
  ]

  if (showKanban) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <BoardView projectId={projectId} onBack={() => { setShowKanban(false); fetchTasks(true) }} />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .task-row:hover > div { background: ${PURPLE_5} !important; }
        .crm-tab-btn {
          padding: 7px 16px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600; transition: all 0.15s;
          display: flex; align-items: center; gap: 7px; font-family: inherit;
        }
        .crm-tab-btn:hover { background: ${PURPLE_5}; color: ${PURPLE}; }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh', background: '#F8F9FA', fontFamily: 'system-ui,sans-serif' }}>

        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '18px 28px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Title */}
            <div>
              <h1 style={{ color: PURPLE, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-.3px' }}>All Tasks</h1>
              <p style={{ color: '#6B7280', fontSize: 13, margin: '3px 0 0' }}>Tasks across all boards · {tasks.length} total</p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Refresh */}
              <button
                onClick={() => fetchTasks(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 10, color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${PURPLE}50`; e.currentTarget.style.color = PURPLE }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151' }}
              >
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                Refresh
              </button>

              {/* Filter */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
                    background: activeFiltersCount > 0 ? PURPLE_10 : '#FFFFFF',
                    border: `1px solid ${activeFiltersCount > 0 ? PURPLE : '#E5E7EB'}`,
                    borderRadius: 10, color: activeFiltersCount > 0 ? PURPLE : '#374151',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', position: 'relative', transition: 'all 0.15s'
                  }}
                >
                  <Filter size={13} />
                  Filter
                  {activeFiltersCount > 0 && (
                    <span style={{ position: 'absolute', top: -6, right: -6, background: PURPLE, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {showFilters && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowFilters(false)} />
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 300, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, boxShadow: '0 10px 30px rgba(74,31,111,0.12)', zIndex: 1000, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: PURPLE, margin: 0 }}>Filter Tasks</h3>
                        {activeFiltersCount > 0 && (
                          <button onClick={clearAllFilters} style={{ fontSize: 11, color: PURPLE, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear all</button>
                        )}
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        {/* Board Filter */}
                        <div style={{ padding: '8px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>By Board</div>
                          {boards.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', padding: '8px 0' }}>Loading boards...</div>
                          ) : boards.map(board => (
                            <label key={board.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
                              <input type="checkbox" checked={filterBoards.has(board.id)} onChange={e => { const s = new Set(filterBoards); e.target.checked ? s.add(board.id) : s.delete(board.id); setFilterBoards(s) }} style={{ accentColor: PURPLE, cursor: 'pointer' }} />
                              <span style={{ fontSize: 13, color: '#111827' }}>{board.name}</span>
                            </label>
                          ))}
                        </div>
                        <div style={{ height: 1, background: '#F3F4F6', margin: '8px 0' }} />
                        {/* Assigned Filter */}
                        <div style={{ padding: '8px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Assigned To</div>
                          {users.slice(0, 10).map(user => (
                            <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
                              <input type="checkbox" checked={filterMembers.has(user.id)} onChange={e => { const s = new Set(filterMembers); e.target.checked ? s.add(user.id) : s.delete(user.id); setFilterMembers(s) }} style={{ accentColor: PURPLE, cursor: 'pointer' }} />
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: `linear-gradient(135deg,${PURPLE},${PURPLE_DARK})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 13, color: '#111827' }}>{user.name}</span>
                            </label>
                          ))}
                        </div>
                        <div style={{ height: 1, background: '#F3F4F6', margin: '8px 0' }} />
                        {/* Due Date Filter */}
                        <div style={{ padding: '8px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Due Date</div>
                          {['Overdue', 'Due next day', 'Due next week', 'No due date'].map(option => (
                            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
                              <input type="checkbox" checked={filterDueDate.has(option)} onChange={e => { const s = new Set(filterDueDate); e.target.checked ? s.add(option) : s.delete(option); setFilterDueDate(s) }} style={{ accentColor: PURPLE, cursor: 'pointer' }} />
                              <span style={{ fontSize: 13, color: '#111827' }}>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Open Board */}
              <button
                onClick={() => setShowKanban(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', background: `linear-gradient(135deg,${PURPLE},${PURPLE_DARK})`, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 12px ${PURPLE}40` }}
              >
                <LayoutGrid size={13} />
                Open Board
              </button>
            </div>
          </div>

          {/* Tab Filters */}
          <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap', background: '#F8F9FA', padding: '4px', borderRadius: 12, border: '1px solid #E5E7EB', width: 'fit-content' }}>
            {TABS.map(tab => {
              const active = activeFilter === tab.key
              return (
                <button
                  key={tab.key}
                  className="crm-tab-btn"
                  onClick={() => setActiveFilter(tab.key)}
                  style={{
                    background: active ? PURPLE : 'transparent',
                    color: active ? '#FFFFFF' : '#6B7280',
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? `0 2px 8px ${PURPLE}30` : 'none',
                  }}
                >
                  {tab.label}
                  <span style={{
                    padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                    color: active ? '#fff' : '#9CA3AF',
                  }}>
                    {counts[tab.key]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${PURPLE_10}`, borderTopColor: PURPLE, animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Loading all tasks…</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 14, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: PURPLE_10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={36} color={PURPLE} />
              </div>
              <h3 style={{ color: '#111827', fontSize: 20, fontWeight: 700, margin: 0 }}>No tasks found</h3>
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Try adjusting your filters or create a new task</p>
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 200px 180px', gap: 16, padding: '12px 20px', background: PURPLE_5, borderBottom: `1px solid ${PURPLE}15`, fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                <div />
                <div>Name</div>
                <div>Assignee</div>
                <div>Due Date</div>
              </div>

              {/* Grouped Rows */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div>
                    {(['todo', 'in_progress', 'blocked', 'done'] as const).map(statusKey => {
                      const group = taskGroups[statusKey]
                      if (group.length === 0) return null
                      const cfg = STATUS_CFG[statusKey]
                      return (
                        <div key={statusKey}>
                          {/* Section Header */}
                          <div style={{ background: cfg.rowBg, color: cfg.rowText, fontWeight: 700, fontSize: 12, padding: '10px 20px', borderBottom: `1px solid ${cfg.rowBorder}`, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                            {cfg.text} ({group.length})
                          </div>
                          {group.map((task, idx) => (
                            <SortableTaskRow
                              key={task.id}
                              task={task}
                              idx={idx}
                              totalTasks={group.length}
                              onTaskClick={() => setSelectedTask(task)}
                              onComplete={() => completeTask(task.id)}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={{ ...selectedTask, list_id: selectedTask.list_id || '', position: selectedTask.position ?? 0 }}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { fetchTasks(true); setSelectedTask(null) }}
          boardId={selectedTask.board?.id || ''}
          projectId={projectId}
        />
      )}
    </>
  )
}
