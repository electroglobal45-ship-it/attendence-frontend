'use client'

import React, { useEffect, useState } from 'react'
import { Clock, RefreshCw, LayoutGrid, CheckCircle2, Filter } from 'lucide-react'
import { TaskDetailModal } from '@/components/board/TaskDetailModal'
import { BoardView } from '@/components/board/BoardView'
import { usePrefetchStore } from '@/lib/store/prefetch-store'
import { PageWrapper } from '@/components/layout/PageWrapper'

// -- Theme ---------------------------------------------------------------------
const PURPLE      = '#4A1F6F'
const PURPLE_DARK = '#2D0F47'
const GOLD        = '#D9A441'
const PURPLE_10   = 'rgba(74,31,111,0.10)'
const PURPLE_5    = 'rgba(74,31,111,0.05)'

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
  board_id?: string
}

const STATUS_CFG: Record<string, { text: string; dot: string; rowBg: string; rowBorder: string; rowText: string }> = {
  todo:        { text: 'To Do',       dot: PURPLE,    rowBg: PURPLE_5,               rowBorder: `${PURPLE}30`, rowText: PURPLE    },
  in_progress: { text: 'In Progress', dot: GOLD,      rowBg: 'rgba(217,164,65,.05)', rowBorder: `${GOLD}40`,   rowText: '#92650a' },
  done:        { text: 'Done',        dot: '#22C55E', rowBg: '#F0FDF4',              rowBorder: '#BBF7D0',      rowText: '#15803D' },
}

type FilterKey = 'all' | 'todo' | 'in_progress' | 'done'

/* -- Task Row ----------------------------------------------------------------- */
function TaskRow({
  task, idx, totalTasks, onTaskClick, onComplete,
}: {
  task: Task; idx: number; totalTasks: number; onTaskClick: () => void; onComplete: () => void
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div onClick={onTaskClick} className="task-row">
      <div
        className="task-row-grid"
        style={{
          borderBottom: idx < totalTasks - 1 ? '1px solid #F3F4F6' : 'none',
          cursor: 'pointer',
          transition: 'background 0.15s',
          alignItems: 'center',
        }}
      >
        {/* Complete Button */}
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {task.status !== 'done' ? (
            <button
              onClick={onComplete}
              title="Mark as Done"
              style={{ width: 24, height: 24, borderRadius: '50%', background: '#F0FDF4', border: '1.5px solid #22C55E', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', minHeight: 'unset' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#DCFCE7'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F0FDF4'; e.currentTarget.style.transform = 'none' }}
            >&#10003;</button>
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>&#10003;</div>
          )}
        </div>

        {/* Name + Board Badge */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {task.board?.name && (
              <span className="lg:hidden" style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: 'rgba(74,31,111,0.06)', color: PURPLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                {task.board.name}
              </span>
            )}
            {task.due_date && (
              <span
                className="lg:hidden"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 500, color: isOverdue ? '#EF4444' : '#6B7280', minHeight: 'unset' }}
              >
                <span>&#8226;</span>
                <span style={isOverdue ? { fontWeight: 600 } : undefined}>
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {isOverdue && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#EF4444', background: '#FEE2E2', padding: '1px 4px', borderRadius: 3 }}>OVERDUE</span>
                )}
              </span>
            )}
            {task.labels && task.labels.slice(0, 2).map((lbl: any, i: number) => (
              <span key={i} title={lbl.name || 'LABEL'} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: lbl.color || GOLD, marginLeft: i === 0 ? 2 : 0 }} />
            ))}
          </div>
        </div>

        {/* Desktop: Board column */}
        <div className="task-desktop-col">
          {task.board?.name ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${PURPLE},${PURPLE_DARK})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {task.board.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.board.name}</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No board</span>
          )}
        </div>

        {/* Desktop: Due Date column */}
        <div className="task-desktop-col">
          {task.due_date ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Clock size={14} color={isOverdue ? '#EF4444' : '#6B7280'} />
              <span style={{ fontSize: 13, color: isOverdue ? '#EF4444' : '#111827', fontWeight: isOverdue ? 600 : 500 }}>
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {isOverdue && <span style={{ padding: '1px 5px', background: '#FEE2E2', color: '#EF4444', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>OVERDUE</span>}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No due date</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* -- Page -------------------------------------------------------------------- */
export default function MyTasksPage() {
  const storeTasks = usePrefetchStore((state) => state.myTasks)
  const prefetchStatus = usePrefetchStore((state) => state.status)

  const allTasks: Task[] = storeTasks || []
  const loading = prefetchStatus.tasks === 'loading' && allTasks.length === 0

  const [refreshing, setRefreshing] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [projectId] = useState('c691dc11-b522-4e80-8ae6-337244d2a28d')
  const [showKanban, setShowKanban] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(undefined)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const [filterBoards, setFilterBoards] = useState<Set<string>>(new Set())
  const [filterDueDate, setFilterDueDate] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [boards, setBoards] = useState<any[]>([])

  const token = () => localStorage.getItem('authToken')

  const fetchBoards = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/boards/project/${projectId}`, { headers: { Authorization: `Bearer ${token()}` } })
      if (res.ok) { const data = await res.json(); setBoards(data.data?.boards || []) }
    } catch {}
  }

  const extractBoardsFromTasks = () => {
    const uniqueBoards = new Map()
    allTasks.forEach(task => { if (task.board?.id && !uniqueBoards.has(task.board.id)) uniqueBoards.set(task.board.id, task.board) })
    const arr = Array.from(uniqueBoards.values())
    if (arr.length > 0 && boards.length === 0) setBoards(arr)
  }

  const refreshTasks = async () => {
    setRefreshing(true)
    try { await usePrefetchStore.getState().refreshChunk('tasks') } catch {}
    finally { setRefreshing(false) }
  }

  useEffect(() => {
    const store = usePrefetchStore.getState()
    if (!store.isPrefetched) store.prefetchAll().catch(console.error)
    fetchBoards()
  }, [])

  useEffect(() => { if (allTasks.length > 0) extractBoardsFromTasks() }, [allTasks])

  const completeTask = async (taskId: string) => {
    usePrefetchStore.getState().removeTask(taskId)
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const res = await fetch(`${BACKEND_URL}/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (!res.ok) usePrefetchStore.getState().refreshChunk('tasks')
    } catch { usePrefetchStore.getState().refreshChunk('tasks') }
  }

  const filteredByFilters = allTasks.filter(task => {
    if (filterBoards.size > 0 && !filterBoards.has(task.board?.id || '')) return false
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

  const filteredTasks = filteredByFilters.filter(t => activeFilter === 'all' || t.status === activeFilter)

  const taskGroups = {
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    todo:        filteredTasks.filter(t => t.status === 'todo'),
    done:        filteredTasks.filter(t => t.status === 'done'),
  }

  const counts: Record<FilterKey, number> = {
    all:         filteredByFilters.length,
    in_progress: filteredByFilters.filter(t => t.status === 'in_progress').length,
    todo:        filteredByFilters.filter(t => t.status === 'todo').length,
    done:        filteredByFilters.filter(t => t.status === 'done').length,
  }

  const activeFiltersCount = filterBoards.size + filterDueDate.size
  const clearAllFilters = () => { setFilterBoards(new Set()); setFilterDueDate(new Set()) }

  const TABS: { key: FilterKey; label: string; mobileLabel: string }[] = [
    { key: 'all',         label: 'All Tasks',   mobileLabel: 'All'   },
    { key: 'in_progress', label: 'In Progress', mobileLabel: 'Doing' },
    { key: 'todo',        label: 'To Do',       mobileLabel: 'To Do' },
    { key: 'done',        label: 'Done',        mobileLabel: 'Done'  },
  ]

  if (showKanban) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100vh' }}>
        <BoardView projectId={projectId} initialBoardId={selectedBoardId} onBack={() => { setShowKanban(false); setSelectedBoardId(undefined) }} />
      </div>
    )
  }

  return (
    <PageWrapper
      title="My Tasks"
      subtitle={`Tasks assigned to you · ${allTasks.length} total`}
      actions={
        <div className="tasks-header-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Filter */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 sm:px-3"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeFiltersCount > 0 ? PURPLE_10 : '#FFFFFF', border: `1px solid ${activeFiltersCount > 0 ? PURPLE : '#E5E7EB'}`, borderRadius: 10, color: activeFiltersCount > 0 ? PURPLE : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', position: 'relative', transition: 'all 0.15s' }}
              title="Filter Tasks"
            >
              <Filter size={14} />
              {activeFiltersCount > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: PURPLE, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {showFilters && (
              <>
                <div className="filter-backdrop" onClick={() => setShowFilters(false)} />
                <div className="filter-dropdown-container">
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: PURPLE, margin: 0 }}>Filter Tasks</h3>
                    {activeFiltersCount > 0 && <button onClick={clearAllFilters} style={{ fontSize: 11, color: PURPLE, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear all</button>}
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ padding: '8px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>By Board</div>
                      {boards.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', padding: '8px 0' }}>No boards loaded</div>
                      ) : boards.map(board => (
                        <label key={board.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
                          <input type="checkbox" checked={filterBoards.has(board.id)} onChange={e => { const s = new Set(filterBoards); e.target.checked ? s.add(board.id) : s.delete(board.id); setFilterBoards(s) }} style={{ accentColor: PURPLE, cursor: 'pointer' }} />
                          <span style={{ fontSize: 13, color: '#111827' }}>{board.name}</span>
                        </label>
                      ))}
                    </div>
                    <div style={{ height: 1, background: '#F3F4F6', margin: '8px 0' }} />
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

          <button
            onClick={() => setShowKanban(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: `linear-gradient(135deg,${PURPLE},${PURPLE_DARK})`, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 12px ${PURPLE}40` }}
          >
            <LayoutGrid size={13} />
            Board
          </button>
        </div>
      }
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .task-row:hover > div { background: #F8FAFC !important; }
        .task-row-grid { border-bottom: 1px solid #E2E8F0 !important; }
        .task-row:last-child .task-row-grid { border-bottom: none !important; }
        .crm-tab-btn {
          padding: 6px 10px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600; transition: all 0.15s;
          display: flex; align-items: center; gap: 6px; font-family: inherit;
          white-space: nowrap; flex-shrink: 0; min-height: unset !important;
        }
        @media (min-width: 640px) { .crm-tab-btn { padding: 7px 16px; gap: 7px; } }
        .crm-tab-btn:hover { background: rgba(74,31,111,0.05); color: #4A1F6F; }

        .tasks-content-container { padding: 16px 14px; }
        .task-table-header { display: none; }
        .task-row-grid { display: grid; grid-template-columns: 40px 1fr; gap: 8px; padding: 12px 14px; }
        .task-desktop-col { display: none; }

        .filter-backdrop {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
        }
        .filter-dropdown-container {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: calc(100vw - 32px); max-width: 320px;
          background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15); z-index: 1000;
          max-height: 80vh; overflow-y: auto;
        }

        @media (min-width: 1024px) {
          .tasks-content-container { padding: 24px 28px; }
          .task-table-header { display: grid; grid-template-columns: 40px 1fr 200px 180px; }
          .task-row-grid { grid-template-columns: 40px 1fr 200px 180px; gap: 16px; padding: 14px 20px; }
          .task-desktop-col { display: block; }
          .filter-backdrop { background: transparent; backdrop-filter: none; }
          .filter-dropdown-container {
            position: absolute; right: 0; top: 100%; left: auto; transform: none;
            width: 300px; max-width: none; margin-top: 8px;
            box-shadow: 0 10px 30px rgba(74,31,111,0.12); max-height: calc(100vh - 200px);
          }
        }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Tab Filters */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: 4, marginTop: 14, overflowX: 'auto', whiteSpace: 'nowrap', background: '#F8F9FA', padding: '4px', borderRadius: 12, border: '1px solid #E5E7EB', width: 'fit-content' } as any}>
          {TABS.map(tab => {
            const active = activeFilter === tab.key
            return (
              <button
                key={tab.key}
                className="crm-tab-btn"
                onClick={() => setActiveFilter(tab.key)}
                style={{ background: active ? PURPLE : 'transparent', color: active ? '#FFFFFF' : '#6B7280', fontWeight: active ? 700 : 500, boxShadow: active ? `0 2px 8px ${PURPLE}30` : 'none' }}
              >
                <span className="sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: active ? 'rgba(255,255,255,0.2)' : '#E5E7EB', color: active ? '#fff' : '#9CA3AF' }}>
                  {counts[tab.key]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="tasks-content-container" style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${PURPLE_10}`, borderTopColor: PURPLE, animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 14, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: PURPLE_10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={36} color={PURPLE} />
              </div>
              <h3 style={{ color: '#111827', fontSize: 20, fontWeight: 700, margin: 0 }}>No tasks here</h3>
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Tasks assigned to you will appear here</p>
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 18px rgba(74,31,111,0.06)' }}>
              {/* Table Header */}
              <div className="task-table-header" style={{ gap: 16, padding: '12px 20px', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', fontSize: 11, fontWeight: 800, color: '#4A1F6F', textTransform: 'uppercase', letterSpacing: '.8px' }}>
                <div />
                <div>Name</div>
                <div>Board</div>
                <div>Due Date</div>
              </div>

              {/* Directly List All Filtered Rows */}
              <div>
                {filteredTasks.map((task, idx) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    idx={idx}
                    totalTasks={filteredTasks.length}
                    onTaskClick={() => setSelectedTask(task)}
                    onComplete={() => completeTask(task.id)}
                  />
                ))}
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
    </PageWrapper>
  )
}
