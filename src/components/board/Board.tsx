'use client'

import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, X, Loader2 } from 'lucide-react'
import { List } from './List'

/* Add CSS animation for spinner */
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  if (!document.querySelector('style[data-board-animations]')) {
    style.setAttribute('data-board-animations', 'true')
    document.head.appendChild(style)
  }
}

/* ── Design tokens — light theme ── */
const DS = {
  boardBg:     '#F8F9FA',  // light grey board background
  listBg:      '#FFFFFF',  // white list column background
  listBorder:  '#E5E7EB',  // light border
  inputBg:     '#FFFFFF',
  inputBorder: '#D1D5DB',
  textPrimary: '#374151',
  textMuted:   '#6B7280',
  textWhite:   '#111827',
  accent:      '#3B82F6',
  accentDark:  '#2563EB',
  hover:       '#F3F4F6',
  movingBg:    '#FFFFFF',
}

interface Task {
  id: string
  public_id: string
  title: string
  description?: string
  list_id: string
  assigned_to?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  completion_percentage: number
  position: number
  cover_color?: string
  labels?: Array<{ colorId: string; name?: string }>
  checklist_stats?: { completed: number; total: number }
  comment_count?: number
  attachment_count?: number
  assigned_user?: { id: string; name: string; email: string }
}

interface ListObj {
  id: string
  public_id: string
  name: string
  position: number
  color: string
  board_id?: string
}

interface BoardProps {
  projectId: string
  lists: ListObj[]
  tasks: Task[]
  boardBackground?: string
  canManageBoard?: boolean
  onTaskClick?: (task: Task) => void
  onAddTask?: (listId: string) => void
  onTaskCreated?: (task: Task) => void
  onAddList?: (name: string) => void
  onEditList?: (list: ListObj) => void
  onRefresh?: () => void
}

export function Board({
  projectId,
  lists,
  tasks,
  boardBackground,
  canManageBoard = true,
  onTaskClick,
  onAddTask,
  onTaskCreated,
  onAddList,
  onEditList,
  onRefresh,
}: BoardProps) {
  const [localLists, setLocalLists]   = useState(lists)
  const [localTasks, setLocalTasks]   = useState(tasks)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]) // New optimistic tasks
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName]  = useState('')
  const [addingListLoading, setAddingListLoading] = useState(false)
  const [addHov, setAddHov]           = useState(false)
  const isUpdatingListsRef = useRef(false)
  const isUpdatingTasksRef = useRef(false)

  // Only update local lists if we're not in the middle of dragging/updating
  useEffect(() => {
    if (!isUpdatingListsRef.current) {
      setLocalLists(lists)
    }
  }, [lists])
  
  useEffect(() => { 
    if (!isUpdatingTasksRef.current) {
      setLocalTasks(tasks)
      // Clear optimistic tasks that now exist in real tasks
      setOptimisticTasks(prev => prev.filter(opt => !tasks.some(t => t.id === opt.id || t.title === opt.title)))
    }
  }, [tasks])

  /* ── Add optimistic task directly to UI ── */
  const addOptimisticTask = (listId: string, title: string): string => {
    const optimisticId = `temp-${Date.now()}`
    // Calculate position from all tasks (local + optimistic)
    const allCurrentTasks = [...localTasks, ...optimisticTasks]
    const existingTasks = allCurrentTasks.filter(t => t.list_id === listId)
    const newTask: Task = {
      id: optimisticId,
      public_id: optimisticId,
      title: title.trim(),
      list_id: listId,
      position: existingTasks.length > 0 ? existingTasks[existingTasks.length - 1].position + 65536 : 65536,
      priority: 'medium',
      status: 'todo',
      completion_percentage: 0,
      description: '',
      assigned_to: undefined,
      due_date: undefined,
      cover_color: undefined,
      labels: [],
    }
    setOptimisticTasks(prev => [...prev, newTask])
    return optimisticId
  }

  /* ── group + sort tasks by list (including optimistic) ── */
  const allTasks = [...localTasks, ...optimisticTasks]
  const tasksByList = allTasks.reduce((acc, task) => {
    if (!acc[task.list_id]) acc[task.list_id] = []
    acc[task.list_id].push(task)
    return acc
  }, {} as Record<string, Task[]>)
  Object.keys(tasksByList).forEach(id => {
    tasksByList[id].sort((a, b) => a.position - b.position)
  })

  /* ── drag end ── */
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId, type } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    if (type === 'list') {
      isUpdatingListsRef.current = true
      const newLists = Array.from(localLists)
      const [moved] = newLists.splice(source.index, 1)
      newLists.splice(destination.index, 0, moved)
      
      // Update positions immediately so UI doesn't revert on sort
      const updatedLists = newLists.map((list, i) => ({
        ...list,
        position: (i + 1) * 65536
      }))
      
      setLocalLists(updatedLists)
      
      // Update backend positions
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const updates = updatedLists.map((list) => {
        return fetch(`${BACKEND_URL}/api/v1/lists/${list.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ position: list.position }),
        })
      })
      
      Promise.all(updates).then(() => {
        onRefresh?.()
        setTimeout(() => {
          isUpdatingListsRef.current = false
        }, 2000)
      }).catch((err) => {
        console.error('Failed to update list positions:', err)
        isUpdatingListsRef.current = false
      })
      return
    }

    const newTasks = [...allTasks]
    const idx = newTasks.findIndex(t => t.id === draggableId)
    const task = newTasks[idx]
    newTasks.splice(idx, 1)
    
    // Find siblings in the destination list to calculate an optimistic position
    const destTasks = newTasks.filter(t => t.list_id === destination.droppableId)
    destTasks.sort((a, b) => a.position - b.position)
    
    let newPosition = 65536
    if (destTasks.length === 0) {
      newPosition = 65536
    } else if (destination.index === 0) {
      newPosition = destTasks[0].position / 2
    } else if (destination.index >= destTasks.length) {
      newPosition = destTasks[destTasks.length - 1].position + 65536
    } else {
      newPosition = (destTasks[destination.index - 1].position + destTasks[destination.index].position) / 2
    }

    task.list_id = destination.droppableId
    task.position = newPosition

    // Update status based on list name
    const destList = localLists.find(l => l.id === destination.droppableId)
    if (destList && destList.name) {
      const name = destList.name.toLowerCase().trim()
      if (name.includes('to do') || name.includes('todo')) {
        task.status = 'todo'
      } else if (name.includes('in progress') || name.includes('progress')) {
        task.status = 'in_progress'
      } else if (name.includes('done') || name.includes('complete')) {
        task.status = 'done'
      } else if (name.includes('blocked')) {
        task.status = 'blocked'
      } else if (name.includes('review')) {
        task.status = 'review'
      }
    }

    const destStart = newTasks.findIndex(t => t.list_id === destination.droppableId)
    newTasks.splice(destStart >= 0 ? destStart + destination.index : newTasks.length, 0, task)
    
    isUpdatingTasksRef.current = true
    
    // Update both local and optimistic appropriately
    if (task.id.startsWith('temp-')) {
      setOptimisticTasks(newTasks.filter(t => t.id.startsWith('temp-')))
    } else {
      setLocalTasks(newTasks.filter(t => !t.id.startsWith('temp-')))
    }
    
    // Save to backend
    const token = localStorage.getItem('authToken')
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    fetch(`${BACKEND_URL}/api/v1/tasks/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        task_id: draggableId,
        source_list_id: source.droppableId,
        destination_list_id: destination.droppableId,
        destination_position: destination.index,
      }),
    }).then(res => {
      if (!res.ok) {
        console.error('Failed to move task')
        setLocalTasks(tasks)
        isUpdatingTasksRef.current = false
      } else {
        onRefresh?.()
        setTimeout(() => { isUpdatingTasksRef.current = false }, 2000)
      }
    }).catch(() => {
      setLocalTasks(tasks)
      isUpdatingTasksRef.current = false
    })
  }

  const handleAddList = async () => {
    if (newListName.trim()) {
      setAddingListLoading(true)
      try {
        await onAddList?.(newListName.trim())
        setNewListName('')
        setIsAddingList(false)
      } finally {
        setAddingListLoading(false)
      }
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddList()
    else if (e.key === 'Escape') { setIsAddingList(false); setNewListName('') }
  }

  const handleTaskCreated = (newTask: Task, tempId?: string) => {
    if (tempId) {
      setOptimisticTasks(prev => prev.filter(t => t.id !== tempId))
    }
    onTaskCreated?.(newTask)
  }

  return (
    <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background: boardBackground || DS.boardBg }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ flex: 1, minHeight: 0, overflowX:'auto', overflowY:'auto', padding:'12px 16px', boxSizing:'border-box' }}>
          <Droppable droppableId="all-lists" direction="horizontal" type="list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display:'flex', gap:12, alignItems:'flex-start', minHeight:'100%', paddingBottom: 12 }}
              >
                {localLists
                  .sort((a, b) => a.position - b.position)
                  .map((list, index) => (
                    <Draggable key={list.id} draggableId={list.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <List
                            list={list}
                            tasks={tasksByList[list.id] || []}
                            canManageBoard={canManageBoard}
                            onTaskClick={onTaskClick}
                            onAddTask={onAddTask}
                            onAddOptimisticTask={addOptimisticTask}
                            onTaskCreated={handleTaskCreated}
                            onEditList={onEditList}
                            onDeleteList={onRefresh}
                            dragHandleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}

                {/* ── Add another list ── */}
                {canManageBoard && (
                  <div style={{ flexShrink:0, width:272 }}>
                  {isAddingList ? (
                    <div style={{
                      background:DS.listBg, border:`1px solid ${DS.listBorder}`,
                      borderRadius:10, padding:10,
                      boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
                    }}>
                      <input
                        autoFocus
                        type="text"
                        value={newListName}
                        onChange={e => setNewListName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter list title…"
                        disabled={addingListLoading}
                        style={{
                          width:'100%', boxSizing:'border-box',
                          background:DS.inputBg, border:`2px solid ${DS.accent}`,
                          borderRadius:5, padding:'7px 10px',
                          color:'#111827', fontSize:13, outline:'none',
                          marginBottom:8,
                          opacity: addingListLoading ? 0.6 : 1,
                        }}
                      />
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <button
                          onClick={handleAddList}
                          disabled={addingListLoading}
                          style={{
                            padding:'6px 14px', background:DS.accentDark, color:'#fff',
                            border:'none', borderRadius:5, cursor: addingListLoading ? 'not-allowed' : 'pointer',
                            fontSize:13, fontWeight:600, transition:'background .12s',
                            opacity: addingListLoading ? 0.7 : 1,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                          onMouseEnter={e=>!addingListLoading&&(e.currentTarget.style.background='#1D4ED8')}
                          onMouseLeave={e=>(e.currentTarget.style.background=DS.accentDark)}
                        >
                          {addingListLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                          {addingListLoading ? 'Creating...' : 'Add list'}
                        </button>
                        <button
                          onClick={() => { setIsAddingList(false); setNewListName('') }}
                          disabled={addingListLoading}
                          style={{
                            background:'transparent', border:'none', cursor: addingListLoading ? 'not-allowed' : 'pointer',
                            color:DS.textMuted, display:'flex', alignItems:'center',
                            padding:5, borderRadius:4, transition:'color .12s',
                            opacity: addingListLoading ? 0.5 : 1,
                          }}
                          onMouseEnter={e=>!addingListLoading&&(e.currentTarget.style.color='#111827')}
                          onMouseLeave={e=>(e.currentTarget.style.color=DS.textMuted)}
                        >
                          <X size={16}/>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingList(true)}
                      onMouseEnter={() => setAddHov(true)}
                      onMouseLeave={() => setAddHov(false)}
                      style={{
                        width:'100%', display:'flex', alignItems:'center', gap:8,
                        padding:'9px 12px',
                        background: addHov ? DS.hover : 'rgba(0,0,0,0.04)',
                        border:`1px solid ${addHov ? DS.listBorder : 'transparent'}`,
                        borderRadius:10, cursor:'pointer',
                        color: DS.textPrimary, fontSize:13, fontWeight:500,
                        transition:'background .15s, border-color .15s',
                      }}
                    >
                      <Plus size={15} style={{ flexShrink:0 }}/>
                      <span>Add another list</span>
                    </button>
                  )}
                </div>
                )}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  )
}
