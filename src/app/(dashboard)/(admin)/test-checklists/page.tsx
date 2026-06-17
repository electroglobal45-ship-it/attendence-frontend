'use client'

import { useEffect, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Plus, Trash2, Check, Square, Loader2 } from 'lucide-react'

interface Task {
  id: string
  title: string
  project_id: string
}

interface Checklist {
  id: string
  title: string
  position: number
  total_items: number
  completed_items: number
  progress_percentage: number
  checklist_items: ChecklistItem[]
}

interface ChecklistItem {
  id: string
  content: string
  is_completed: boolean
  position: number
}

export default function TestChecklistsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(false)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newItemContent, setNewItemContent] = useState<{ [key: string]: string }>({})

  const token = () => localStorage.getItem('authToken')

  // Fetch tasks
  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
        if (data.tasks && data.tasks.length > 0) {
          setSelectedTask(data.tasks[0])
        }
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
    }
  }

  // Fetch checklists for selected task
  useEffect(() => {
    if (selectedTask) {
      fetchChecklists()
    }
  }, [selectedTask])

  const fetchChecklists = async () => {
    if (!selectedTask) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/checklists`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setChecklists(data.checklists || [])
      }
    } catch (err) {
      console.error('Error fetching checklists:', err)
    } finally {
      setLoading(false)
    }
  }

  const createChecklist = async () => {
    if (!selectedTask || !newChecklistTitle.trim()) return
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ title: newChecklistTitle })
      })
      if (res.ok) {
        setNewChecklistTitle('')
        fetchChecklists()
      }
    } catch (err) {
      console.error('Error creating checklist:', err)
    }
  }

  const deleteChecklist = async (checklistId: string) => {
    try {
      const res = await fetch(`/api/checklists/${checklistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        fetchChecklists()
      }
    } catch (err) {
      console.error('Error deleting checklist:', err)
    }
  }

  const addItem = async (checklistId: string) => {
    const content = newItemContent[checklistId]
    if (!content || !content.trim()) return
    try {
      const res = await fetch(`/api/checklists/${checklistId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ content })
      })
      if (res.ok) {
        setNewItemContent({ ...newItemContent, [checklistId]: '' })
        fetchChecklists()
      }
    } catch (err) {
      console.error('Error adding item:', err)
    }
  }

  const toggleItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ is_completed: !isCompleted })
      })
      if (res.ok) {
        fetchChecklists()
      }
    } catch (err) {
      console.error('Error toggling item:', err)
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        fetchChecklists()
      }
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  return (
    <PageWrapper title="Test Checklists" subtitle="Testing checklist functionality">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Task Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Task
          </label>
          <select
            value={selectedTask?.id || ''}
            onChange={(e) => {
              const task = tasks.find(t => t.id === e.target.value)
              setSelectedTask(task || null)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="">Select a task...</option>
            {tasks.map(task => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        {selectedTask && (
          <>
            {/* Create Checklist */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold mb-3">Create New Checklist</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createChecklist()}
                  placeholder="Checklist title..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <button
                  onClick={createChecklist}
                  disabled={!newChecklistTitle.trim()}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            {/* Checklists */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : checklists.length === 0 ? (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No checklists yet. Create one above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {checklists.map(checklist => (
                  <div key={checklist.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    {/* Checklist Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{checklist.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="text-sm text-gray-500">
                            {checklist.completed_items}/{checklist.total_items} completed
                          </div>
                          <div className="flex-1 max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${checklist.progress_percentage}%` }}
                            />
                          </div>
                          <div className="text-sm font-medium text-gray-700">
                            {checklist.progress_percentage}%
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteChecklist(checklist.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Checklist Items */}
                    <div className="space-y-2 mb-3">
                      {checklist.checklist_items?.map(item => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <button
                            onClick={() => toggleItem(item.id, item.is_completed)}
                            className="flex-shrink-0"
                          >
                            {item.is_completed ? (
                              <Check size={20} className="text-green-600" />
                            ) : (
                              <Square size={20} className="text-gray-400" />
                            )}
                          </button>
                          <span className={`flex-1 ${item.is_completed ? 'line-through text-gray-400' : ''}`}>
                            {item.content}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Item */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItemContent[checklist.id] || ''}
                        onChange={(e) => setNewItemContent({ ...newItemContent, [checklist.id]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addItem(checklist.id)}
                        placeholder="Add an item..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                      <button
                        onClick={() => addItem(checklist.id)}
                        disabled={!newItemContent[checklist.id]?.trim()}
                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  )
}
