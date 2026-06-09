'use client'

import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, X } from 'lucide-react'
import { List } from './List'

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
  onTaskClick?: (task: Task) => void
  onAddTask?: (listId: string) => void
  onAddList?: (name: string) => void
  onEditList?: (list: ListObj) => void
  onRefresh?: () => void
}

export function Board({
  projectId,
  lists,
  tasks,
  boardBackground,
  onTaskClick,
  onAddTask,
  onAddList,
  onEditList,
  onRefresh,
}: BoardProps) {
  const [localLists, setLocalLists]   = useState(lists)
  const [localTasks, setLocalTasks]   = useState(tasks)
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName]  = useState('')
  const [addHov, setAddHov]           = useState(false)
  const isUpdatingListsRef = useRef(false)

  // Only update local lists if we're not in the middle of dragging/updating
  useEffect(() => {
    if (!isUpdatingListsRef.current) {
      setLocalLists(lists)
    }
  }, [lists])
  
  useEffect(() => { setLocalTasks(tasks) }, [tasks])

  /* ── group + sort tasks by list ── */
  const tasksByList = localTasks.reduce((acc, task) => {
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
      setLocalLists(newLists)
      
      // Update backend positions
      const token = localStorage.getItem('authToken')
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const updates = newLists.map((list, i) => {
        const newPosition = (i + 1) * 65536
        return fetch(`${BACKEND_URL}/api/v1/lists/${list.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ position: newPosition }),
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

    const newTasks = [...localTasks]
    const idx = newTasks.findIndex(t => t.id === draggableId)
    const task = newTasks[idx]
    newTasks.splice(idx, 1)
    task.list_id = destination.droppableId
    task.position = destination.index
    const destStart = newTasks.findIndex(t => t.list_id === destination.droppableId)
    newTasks.splice(destStart >= 0 ? destStart + destination.index : newTasks.length, 0, task)
    setLocalTasks(newTasks)
    
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
      }
    }).catch(() => setLocalTasks(tasks))
  }

  const handleAddList = () => {
    if (newListName.trim()) { onAddList?.(newListName.trim()); setNewListName(''); setIsAddingList(false) }
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddList()
    else if (e.key === 'Escape') { setIsAddingList(false); setNewListName('') }
  }

  return (
    <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:DS.boardBg }}>
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
                            onTaskClick={onTaskClick}
                            onAddTask={onAddTask}
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
                        style={{
                          width:'100%', boxSizing:'border-box',
                          background:DS.inputBg, border:`2px solid ${DS.accent}`,
                          borderRadius:5, padding:'7px 10px',
                          color:'#111827', fontSize:13, outline:'none',
                          marginBottom:8,
                        }}
                      />
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <button
                          onClick={handleAddList}
                          style={{
                            padding:'6px 14px', background:DS.accentDark, color:'#fff',
                            border:'none', borderRadius:5, cursor:'pointer',
                            fontSize:13, fontWeight:600, transition:'background .12s',
                          }}
                          onMouseEnter={e=>(e.currentTarget.style.background='#1D4ED8')}
                          onMouseLeave={e=>(e.currentTarget.style.background=DS.accentDark)}
                        >
                          Add list
                        </button>
                        <button
                          onClick={() => { setIsAddingList(false); setNewListName('') }}
                          style={{
                            background:'transparent', border:'none', cursor:'pointer',
                            color:DS.textMuted, display:'flex', alignItems:'center',
                            padding:5, borderRadius:4, transition:'color .12s',
                          }}
                          onMouseEnter={e=>(e.currentTarget.style.color='#111827')}
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
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  )
}
