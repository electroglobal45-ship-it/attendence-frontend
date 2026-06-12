'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import {
  X, CheckSquare, Paperclip, Plus, Trash2, Check,
  Search, AlignLeft, MessageSquare, Calendar, MoreHorizontal,
  LogOut, Move, Copy, Layers, FileText, Eye, Share2, Archive, Image,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Download, Send, Clock, User2, Tag, Users
} from 'lucide-react'

// ── Quill (SSR-safe) ──────────────────────────────────────────────────────────
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <div className="h-32 border border-gray-200 rounded-lg bg-gray-50 animate-pulse" />
  ),
})
if (typeof window !== 'undefined') {
  require('react-quill/dist/quill.snow.css')
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Task {
  id: string
  title: string
  description?: string
  list_id: string
  assigned_to?: string
  due_date?: string
  priority: string
  status?: string
  position: number
  cover_color?: string
  assigned_user?: { id: string; name: string; email: string }
  labels?: any[]
}
interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onUpdate: () => void
  boardId: string
  projectId: string
}

// ── Labels ────────────────────────────────────────────────────────────────────
// Dynamic board labels - fetched from backend

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, px = 32 }: { name: string; px?: number }) {
  const palette = ['#F97316','#3B82F6','#8B5CF6','#10B981','#EF4444','#EC4899','#14B8A6']
  const bg = palette[name.charCodeAt(0) % palette.length]
  return (
    <div
      style={{ width: px, height: px, background: bg, fontSize: px * 0.4 }}
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function TaskDetailModal({ task, onClose, onUpdate, boardId, projectId }: TaskDetailModalProps) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  const authHeader  = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const jsonHeaders = useMemo(() => ({ 'Content-Type': 'application/json', ...authHeader }), [authHeader])
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // description
  const [description, setDescription]             = useState(task.description || '')
  const [editingDesc, setEditingDesc]             = useState(false)

  // labels - SINGLE LABEL ONLY
  const [boardLabels, setBoardLabels]             = useState<any[]>([])
  const [selectedLabel, setSelectedLabel]         = useState<string>(() => {
    const firstLabel = task.labels && task.labels.length > 0 ? task.labels[0] : null
    return firstLabel?.id || ''
  })
  const [showLabelsMenu, setShowLabelsMenu]       = useState(false)
  const [labelSearch, setLabelSearch]             = useState('')
  const [creatingLabel, setCreatingLabel]         = useState(false)
  const [newLabelName, setNewLabelName]           = useState('')
  const [newLabelColor, setNewLabelColor]         = useState('#E2B203')

  // checklist
  const [checklistItems, setChecklistItems]       = useState<{ id: string; text: string; checked: boolean }[]>([])
  const [showAddItem, setShowAddItem]             = useState(false)
  const [newItem, setNewItem]                     = useState('')

  // attachments
  const [attachments, setAttachments]             = useState<any[]>([])
  const [uploading, setUploading]                 = useState(false)
  const [lightboxImage, setLightboxImage]         = useState<string | null>(null)

  // members
  const [assignedMembers, setAssignedMembers]     = useState<any[]>([])
  const [availableUsers, setAvailableUsers]       = useState<any[]>([])
  const [showMembersMenu, setShowMembersMenu]     = useState(false)

  // due date & calendar
  const [dueDate, setDueDate]                     = useState(task.due_date || '')
  const [showDueDatePicker, setShowDueDatePicker] = useState(false)
  const [selectedDate, setSelectedDate]           = useState<Date | null>(task.due_date ? new Date(task.due_date) : null)
  const [selectedTime, setSelectedTime]           = useState('12:00') // defaults to 12:00 PM
  const [currentMonth, setCurrentMonth]           = useState(new Date())
  const [hasStartDate, setHasStartDate]           = useState(false)

  // comments / activity
  const [comments, setComments]                   = useState<any[]>([])
  const [activities, setActivities]               = useState<any[]>([])
  const [newComment, setNewComment]               = useState('')
  const [loading, setLoading]                     = useState(true)

  // ⋯ menu
  const [showMenu, setShowMenu]                   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Unsaved changes tracking
  const [isDirty, setIsDirty]                     = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const originalDescription = useRef(task.description || '')

  // Comment attachment state
  const [commentFiles, setCommentFiles]           = useState<File[]>([])
  const [uploadingComment, setUploadingComment]   = useState(false)
  const commentFileRef = useRef<HTMLInputElement>(null)
  
  // Activity tab
  const [activityTab, setActivityTab]             = useState<'all' | 'comments' | 'activity'>('all')

  // Quill modules (stable ref)
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      ['link'],
      ['clean'],
    ],
  }), [])

  // close ⋯ on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // fetch data - ALL PARALLEL
  useEffect(() => { 
    fetchAll()
    fetchAvailableUsers()
    fetchBoardLabels()
  }, [task.id])

  async function fetchBoardLabels() {
    try {
      // Use the boardId prop directly
      if (boardId) {
        const r = await fetch(`${BACKEND_URL}/api/v1/labels/boards/${boardId}`, { headers: authHeader })
        if (r.ok) {
          const data = await r.json()
          setBoardLabels(data.data?.labels || [])
        }
      }
    } catch (err) {
      console.error('Failed to fetch board labels:', err)
    }
  }

  // Sync state when task prop changes (e.g. from parent refresh)
  useEffect(() => {
    setDescription(task.description || '')
    originalDescription.current = task.description || ''
    setIsDirty(false)
    const firstLabel = task.labels && task.labels.length > 0 ? task.labels[0] : null
    setSelectedLabel(firstLabel?.id || '')
    setDueDate(task.due_date || '')
    
    if (task.due_date) {
      const dt = new Date(task.due_date)
      setSelectedDate(dt)
      setSelectedTime(`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`)
    } else {
      setSelectedDate(null)
    }
  }, [task])

  async function fetchAll() {
    setLoading(true)
    
    // Make ALL requests in parallel for faster loading
    const [checklistRes, attachmentsRes, membersRes, commentsRes, activitiesRes] = await Promise.allSettled([
      fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/checklist`, { headers: authHeader }),
      fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/attachments`, { headers: authHeader }),
      fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/members`, { headers: authHeader }),
      fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/comments`, { headers: authHeader }),
      fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/activities`, { headers: authHeader })
    ])

    // Process checklist
    if (checklistRes.status === 'fulfilled' && checklistRes.value.ok) {
      const data = await checklistRes.value.json()
      setChecklistItems(data.data?.items || [])
    }

    // Process attachments
    if (attachmentsRes.status === 'fulfilled' && attachmentsRes.value.ok) {
      const data = await attachmentsRes.value.json()
      setAttachments(data.data?.attachments || [])
    }

    // Process members
    if (membersRes.status === 'fulfilled' && membersRes.value.ok) {
      const data = await membersRes.value.json()
      setAssignedMembers(data.data?.members || [])
    } else if (task.assigned_user) {
      setAssignedMembers([task.assigned_user])
    }

    // Process comments
    if (commentsRes.status === 'fulfilled' && commentsRes.value.ok) {
      const data = await commentsRes.value.json()
      setComments(data.data?.comments || [])
    }

    // Process activities
    if (activitiesRes.status === 'fulfilled' && activitiesRes.value.ok) {
      const data = await activitiesRes.value.json()
      setActivities(data.data?.activities || [])
    }

    setLoading(false)
  }

  async function fetchActivities() {
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/activities`, { headers: authHeader })
      if (r.ok) setActivities((await r.json()).data?.activities || [])
    } catch {}
  }

  async function fetchAvailableUsers() {
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/users`, { headers: authHeader })
      if (r.ok) setAvailableUsers((await r.json()).data?.users || [])
    } catch {}
  }

  // ── description ──────────────────────────────────────────────────────────────
  const saveDescription = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ description }),
      })
      if (r.ok) { 
        setEditingDesc(false)
        setIsDirty(false)
        originalDescription.current = description
        await fetchActivities()
        onUpdate()
      }
    } catch {}
  }

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedDialog(true)
    } else {
      onClose()
    }
  }

  // ── labels ────────────────────────────────────────────────────────────────────
  const changeLabel = async (labelId: string) => {
    const label = boardLabels.find(l => l.id === labelId)
    if (!label) {
      console.error('Label not found:', labelId)
      return
    }
    
    // If same label is clicked, just close picker
    if (selectedLabel === labelId) {
      setShowLabelsMenu(false)
      return
    }
    
    const previousLabel = selectedLabel
    
    // Update UI immediately (optimistic update)
    setSelectedLabel(labelId)
    setShowLabelsMenu(false)
    
    try {
      console.log('Saving label to task:', { taskId: task.id, labelId, labelName: label.name })
      
      const response = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ 
          labels: [{ id: labelId, name: label.name, color: label.color }]
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to save label:', errorData)
        throw new Error('Failed to save label')
      }
      
      console.log('Label saved successfully')
      
      // Refresh activities and parent view
      await fetchActivities()
      onUpdate()
    } catch (err) {
      console.error('Error saving label:', err)
      // Revert on error
      setSelectedLabel(previousLabel)
      alert('Failed to update label. Please try again.')
    }
  }

  const createNewLabel = async () => {
    if (!newLabelName.trim()) return
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/labels`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          board_id: boardId,
          name: newLabelName.trim(),
          color: newLabelColor
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const newLabel = data.data?.label
        if (newLabel) {
          setBoardLabels(prev => [...prev, newLabel])
          setNewLabelName('')
          setNewLabelColor('#E2B203')
          setCreatingLabel(false)
        }
      }
    } catch (err) {
      console.error('Error creating label:', err)
      alert('Failed to create label')
    }
  }

  // ── checklist ─────────────────────────────────────────────────────────────────
  const addChecklistItem = async () => {
    if (!newItem.trim()) return
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/checklist`, {
        method: 'POST', headers: jsonHeaders, body: JSON.stringify({ text: newItem.trim() }),
      })
      if (r.ok) {
        const data = await r.json()
        setChecklistItems(p => [...p, data.data.item])
        setNewItem(''); setShowAddItem(false)
      }
    } catch {}
  }

  const toggleChecklistItem = async (itemId: string) => {
    const item = checklistItems.find(i => i.id === itemId)
    if (!item) return
    setChecklistItems(p => p.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i))
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/checklist/${itemId}`, {
        method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ checked: !item.checked }),
      })
      if (!r.ok) setChecklistItems(p => p.map(i => i.id === itemId ? { ...i, checked: item.checked } : i))
      else await fetchActivities()
    } catch {
      setChecklistItems(p => p.map(i => i.id === itemId ? { ...i, checked: item.checked } : i))
    }
  }

  const deleteChecklistItem = async (itemId: string) => {
    const backup = checklistItems.find(i => i.id === itemId)
    setChecklistItems(p => p.filter(i => i.id !== itemId))
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/checklist/${itemId}`, {
        method: 'DELETE', headers: authHeader,
      })
      if (!r.ok && backup) setChecklistItems(p => [...p, backup])
    } catch { if (backup) setChecklistItems(p => [...p, backup]) }
  }

  // ── attachments ───────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = '' // reset so same file can be re-selected
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/attachments`, {
        method: 'POST', headers: authHeader, body: fd,
      })
      if (r.ok) {
        const data = await r.json()
        const newAtt = data.data?.attachment
        if (newAtt) setAttachments(prev => [newAtt, ...prev])
        else fetchAll()
        await fetchActivities()
      } else {
        const err = await r.json()
        alert('Upload failed: ' + (err.message || 'Unknown error'))
      }
    } catch (err) {
      alert('Upload failed: ' + err)
    } finally { setUploading(false) }
  }

  const deleteAttachment = async (id: string) => {
    try {
      setAttachments(prev => prev.filter(a => a.id !== id))
      await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/attachments/${id}`, { method: 'DELETE', headers: authHeader })
      await fetchActivities()
    } catch {}
  }

  // ── members ───────────────────────────────────────────────────────────────────
  const toggleMember = async (userId: string) => {
    if (!isAdmin) {
      alert('Only admins can modify task members')
      return
    }
    const isMember = assignedMembers.some(m => m.id === userId)
    if (isMember) {
      setAssignedMembers(p => p.filter(m => m.id !== userId))
      try {
        const res1 = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/members/${userId}`, { method: 'DELETE', headers: authHeader })
        if (!res1.ok) {
          console.error('Failed to remove member:', await res1.json())
        }
        if (task.assigned_to === userId || task.assigned_user?.id === userId) {
          const res2 = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`,
            {
              method: 'PUT',
              headers: jsonHeaders,
              body: JSON.stringify({ assigned_to: null }),
            })
          if (!res2.ok) {
            console.error('Failed to clear assigned_to:', await res2.json())
          }
        }
        await fetchActivities()
        onUpdate()
      } catch (err) {
        console.error('Error toggling member off:', err)
      }
    } else {
      const user = availableUsers.find(u => u.id === userId)
      if (user) setAssignedMembers(p => [...p, user])
      try {
        const res1 = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/members`, {
          method: 'POST', headers: jsonHeaders, body: JSON.stringify({ user_id: userId }),
        })
        if (!res1.ok) {
          console.error('Failed to add member:', await res1.json())
        }
        const res2 = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`,
          {
            method: 'PUT',
            headers: jsonHeaders,
            body: JSON.stringify({ assigned_to: userId }),
          })
        if (!res2.ok) {
          console.error('Failed to set assigned_to:', await res2.json())
        }
        await fetchActivities()
        onUpdate()
      } catch (err) {
        console.error('Error toggling member on:', err)
      }
    }
  }

  // ── due date & calendar ───────────────────────────────────────────────────────
  const saveDueDate = async () => {
    if (!isAdmin) {
      alert('Only admins can set or modify due dates')
      return
    }
    if (!selectedDate) return
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const finalDate = new Date(selectedDate)
    finalDate.setHours(hours, minutes, 0, 0)
    const isoDate = finalDate.toISOString()
    
    try {
      await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ due_date: isoDate }),
      })
      setDueDate(isoDate)
      setShowDueDatePicker(false)
      await fetchActivities()
      onUpdate()
    } catch {}
  }

  const markAsDone = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ status: 'done' })
      })
      await fetchActivities()
      onUpdate()
      onClose()
    } catch (err) {
      console.error('Error marking as done:', err)
    }
  }


  const removeDueDate = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ due_date: null }),
      })
      setDueDate('')
      setSelectedDate(null)
      setShowDueDatePicker(false)
      await fetchActivities()
      onUpdate()
    } catch {}
  }

  // Calendar helpers
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    const days: { day: number; isCurrentMonth: boolean }[] = []
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false })
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true })
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false })
    }
    
    return days
  }

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))
  const jumpToStart = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 12))
  const jumpToEnd = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 12))
  
  const selectDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDate(newDate)
  }

  const isToday = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false
    const today = new Date()
    return day === today.getDate() && 
           currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear()
  }

  const isSelected = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth || !selectedDate) return false
    return day === selectedDate.getDate() && 
           currentMonth.getMonth() === selectedDate.getMonth() && 
           currentMonth.getFullYear() === selectedDate.getFullYear()
  }

  // Time options (every 15 minutes)
  const timeOptions = useMemo(() => {
    const options = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
        const period = h < 12 ? 'AM' : 'PM'
        const label = `${hour12}:${String(m).padStart(2, '0')} ${period}`
        const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        options.push({ label, value })
      }
    }
    return options
  }, [])

  // ── comments ──────────────────────────────────────────────────────────────────
  const addComment = async () => {
    if (!newComment.trim() && commentFiles.length === 0) return
    
    const commentText = newComment.trim()
    const filesToUpload = [...commentFiles]
    setNewComment('') // Clear immediately for better UX
    setCommentFiles([])
    setUploadingComment(true)
    
    try {
      // If there are files to attach to the comment, upload them first as task attachments
      const attachmentRefs: any[] = []
      for (const file of filesToUpload) {
        const fd = new FormData()
        fd.append('file', file)
        const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/attachments`, {
          method: 'POST', headers: authHeader, body: fd,
        })
        if (r.ok) {
          const data = await r.json()
          if (data.data?.attachment) {
            attachmentRefs.push({ 
              id: data.data.attachment.id, 
              file_name: data.data.attachment.file_name, 
              file_url: data.data.attachment.file_url,
              file_type: data.data.attachment.file_type  // Add file_type for image detection
            })
            setAttachments(prev => [data.data.attachment, ...prev])
          }
        }
      }

      if (!commentText && attachmentRefs.length === 0) {
        setUploadingComment(false)
        return
      }

      const textToSend = commentText || `📎 Attached ${attachmentRefs.length} file(s)`
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/comments`, {
        method: 'POST', 
        headers: jsonHeaders, 
        body: JSON.stringify({ comment: textToSend, attachments: attachmentRefs }),
      })
      
      const result = await r.json()
      
      if (r.ok && result.data?.comment) {
        setComments(prev => [...prev, result.data.comment])
        fetchActivities()
      } else {
        setNewComment(commentText)
        setCommentFiles(filesToUpload)
      }
    } catch (err) {
      console.error('Error adding comment:', err)
      setNewComment(commentText)
      setCommentFiles(filesToUpload)
    } finally {
      setUploadingComment(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    try {
      setComments(prev => prev.filter(c => c.id !== commentId))
      await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}/comments/${commentId}`, { method: 'DELETE', headers: authHeader })
    } catch {}
  }

  // ── archive ───────────────────────────────────────────────────────────────────
  const archiveTask = async () => {
    if (!confirm('Archive this card?')) return
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ archived: true }),
      })
      if (r.ok) { onUpdate(); onClose() }
    } catch {}
  }

  // ── delete ────────────────────────────────────────────────────────────────────
  const deleteCard = async () => {
    if (!confirm('Are you sure you want to permanently delete this card?')) return
    try {
      const r = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'DELETE',
        headers: authHeader,
      })
      if (r.ok) {
        onUpdate()
        onClose()
      } else {
        alert('Failed to delete card')
      }
    } catch {
      alert('Error deleting card')
    }
  }

  // ── save all ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Validation: label, due date, and at least one member are mandated
    if (!selectedLabel) {
      alert('Please select a label before saving')
      return
    }
    if (!dueDate) {
      alert('Due date is required')
      return
    }
    if (assignedMembers.length === 0) {
      alert('At least one member must be assigned to the task')
      return
    }
    
    const label = boardLabels.find(l => l.id === selectedLabel)
    
    try {
      console.log('Saving task with label:', { labelId: label?.id, labelName: label?.name })
      
      const response = await fetch(`${BACKEND_URL}/api/v1/tasks/${task.id}`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ 
          description, 
          due_date: dueDate,
          labels: label ? [{ id: label.id, name: label.name, color: label.color }] : []
        }),
      })
      if (response.ok) {
        setIsDirty(false)
        originalDescription.current = description
        onUpdate()
        onClose()
      } else {
        const errorData = await response.json()
        console.error('Failed to save:', errorData)
        alert('Failed to save task changes')
      }
    } catch (err) {
      console.error('Error saving:', err)
      alert('Error saving task changes')
    }
  }

  // ── computed ──────────────────────────────────────────────────────────────────
  const completedItems  = checklistItems.filter(i => i.checked).length
  const totalItems      = checklistItems.length
  const pct             = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const isOverdue       = dueDate && new Date(dueDate) < new Date()
  const filteredLabels  = boardLabels.filter(l => 
    l.name?.toLowerCase().includes(labelSearch.toLowerCase())
  )
  const currentLabel    = boardLabels.find(l => l.id === selectedLabel)

  const formatDueDate = (d: string) => {
    const dt = new Date(d)
    const date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return `${date}, ${time}`
  }

  const formatActivityDate = (d: string) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Merge activities and comments for display
  const allActivity = useMemo(() => {
    const merged = [
      ...activities.map((a: any) => ({
        id: a.id,
        type: 'activity' as const,
        user: a.users?.name || 'System',
        userId: a.users?.id,
        text: a.description || a.activity || 'updated this card',
        created_at: a.created_at,
        isSystem: a.is_system,
      })),
      ...comments.map((c: any) => ({
        id: c.id,
        type: 'comment' as const,
        user: c.users?.name || c.user_name || 'User',
        userId: c.user_id,
        text: c.content || '',
        attachments: c.attachments || [],
        created_at: c.created_at,
        isSystem: false,
      })),
    ]
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [activities, comments])

  const filteredActivity = useMemo(() => {
    if (activityTab === 'comments') return allActivity.filter(a => a.type === 'comment')
    if (activityTab === 'activity') return allActivity.filter(a => a.type === 'activity')
    return allActivity
  }, [allActivity, activityTab])

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[900px] shadow-2xl flex flex-col my-auto"
        style={{ fontFamily: "'Inter', system-ui, sans-serif", maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ════ TOP BAR ════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
          {/* just the task title — no list name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-5 h-5 rounded-full border-2 border-gray-400 shrink-0" />
            <h2 className="text-[17px] font-semibold text-gray-900 truncate">{task.title}</h2>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-4">
            {/* cover */}
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <Image size={15} />
            </button>

            {/* ⋯ */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(v => !v)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <MoreHorizontal size={15} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 w-52 z-50">
                  {[
                    { icon: <LogOut size={14} />,   label: 'Leave' },
                    { icon: <Move size={14} />,     label: 'Move' },
                    { icon: <Copy size={14} />,     label: 'Copy' },
                    { icon: <Layers size={14} />,   label: 'Mirror' },
                    { icon: <FileText size={14} />, label: 'Make template' },
                    { icon: <Eye size={14} />,      label: 'Watch' },
                  ].map(item => (
                    <button key={item.label} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <span className="text-gray-400">{item.icon}</span>{item.label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Share2 size={14} className="text-gray-400" /> Share
                  </button>
                  <button onClick={archiveTask} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Archive size={14} className="text-gray-400" /> Archive
                  </button>
                  <button onClick={deleteCard} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} className="text-red-400" /> Delete card
                  </button>
                </div>
              )}
            </div>

            {/* close */}
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ════ BODY (two columns) ═════════════════════════════════════════════ */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT ─────────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-w-0">

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setShowMembersMenu(v => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 font-medium transition-colors"
                  >
                    <Users size={13} /> Members
                  </button>
                  {showMembersMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 z-30 w-52 max-h-52 overflow-y-auto">
                      {availableUsers.map(u => (
                        <button
                          key={u.id}
                          onClick={() => { toggleMember(u.id); setShowMembersMenu(false) }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-50 rounded-lg text-sm"
                        >
                          <Avatar name={u.name} px={26} />
                          <span className="flex-1 truncate text-gray-700">{u.name}</span>
                          {assignedMembers.some(m => m.id === u.id) && <Check size={12} className="text-green-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowLabelsMenu(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 font-medium transition-colors"
              >
                <Tag size={13} /> Labels
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowDueDatePicker(v => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 font-medium transition-colors"
                >
                  <Calendar size={13} /> Dates
                </button>
              )}
              <button
                onClick={() => setShowAddItem(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 font-medium transition-colors"
              >
                <CheckSquare size={13} /> Checklist
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 font-medium transition-colors cursor-pointer">
                <Paperclip size={13} /> Attachment
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>

            {/* ── Meta row (Read-only display) ── */}
            <div className="grid grid-cols-3 gap-5">

              {/* Members - Display only */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Users size={14} className="text-gray-400" />
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Members</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {assignedMembers.length > 0 ? (
                    assignedMembers.map(m => (
                      <div key={m.id} title={m.name} className="cursor-default">
                        <Avatar name={m.name} px={30} />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No members</span>
                  )}
                </div>
              </div>

              {/* Labels - Display only */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Tag size={14} className="text-gray-400" />
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Labels</p>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedLabel ? (
                    <div
                      style={{ 
                        background: currentLabel?.color || '#E2B203',
                        color: '#FFFFFF'
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold tracking-wide"
                    >
                      {currentLabel?.name || 'No Label'}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No label</span>
                  )}
                </div>
              </div>

              {/* Due date - Display only */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Calendar size={14} className="text-gray-400" />
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Due date</p>
                </div>
                <div className="relative">
                  {dueDate ? (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                        isOverdue
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Calendar size={11} className="shrink-0" />
                      <span className="leading-tight">{formatDueDate(dueDate)}</span>
                      {isOverdue && (
                        <span className="px-1 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded leading-tight">
                          Overdue
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No due date</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Description (ReactQuill) ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft size={14} className="text-gray-500" />
                <p className="text-sm font-semibold text-gray-800">Description</p>
                {!editingDesc && (
                  <button onClick={() => setEditingDesc(true)} className="ml-auto text-xs text-blue-600 hover:underline">
                    {description ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>

              {editingDesc ? (
                <div>
                  {/* quill styles override for clean look */}
                  <style>{`
                    .task-quill .ql-container { border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; font-size: 14px; min-height: 120px; }
                    .task-quill .ql-toolbar { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; background: #f9fafb; border-color: #e5e7eb; }
                    .task-quill .ql-container { border-color: #e5e7eb; }
                    .task-quill .ql-editor { min-height: 120px; max-height: 360px; overflow-y: auto; }
                    .task-quill.focused .ql-toolbar,
                    .task-quill.focused .ql-container { border-color: #3b82f6; }
                  `}</style>
                  <div className="task-quill border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                    <ReactQuill
                      value={description}
                      onChange={(val) => {
                        setDescription(val)
                        setIsDirty(val !== originalDescription.current)
                      }}
                      modules={quillModules}
                      theme="snow"
                      placeholder="Add a more detailed description..."
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveDescription} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium transition-colors">
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingDesc(false); setDescription(originalDescription.current); setIsDirty(false) }}
                      className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className="min-h-[72px] px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-text text-sm transition-colors"
                >
                  {description
                    ? <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: description }} />
                    : <span className="text-gray-400 italic text-sm">Add a more detailed description...</span>
                  }
                </div>
              )}
            </div>

            {/* ── Checklist ── */}
            {(checklistItems.length > 0 || showAddItem || loading) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare size={14} className="text-gray-500" />
                  <p className="text-sm font-semibold text-gray-800">Checklist</p>
                  {totalItems > 0 && <span className="ml-auto text-xs text-gray-400 tabular-nums">{completedItems}/{totalItems}</span>}
                </div>
                {loading && checklistItems.length === 0 ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-full" />
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                  </div>
                ) : (
                  <>
                    {totalItems > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{pct}%</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="space-y-1 mb-2">
                      {checklistItems.map(item => (
                        <div key={item.id} className="flex items-center gap-2.5 group py-1">
                          <input
                            type="checkbox" checked={item.checked}
                            onChange={() => toggleChecklistItem(item.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                          />
                          <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => deleteChecklistItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {showAddItem ? (
                  <div className="flex gap-2">
                    <input
                      type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                      placeholder="Add an item..." autoFocus
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={addChecklistItem} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      Add
                    </button>
                    <button onClick={() => { setShowAddItem(false); setNewItem('') }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="w-full py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg border border-dashed border-gray-200 transition-colors"
                  >
                    + Add an item
                  </button>
                )}
              </div>
            )}

            {/* ── Attachments ── */}
            {(attachments.length > 0 || loading) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip size={14} className="text-gray-500" />
                  <p className="text-sm font-semibold text-gray-800">Attachments</p>
                </div>
                {loading && attachments.length === 0 ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-14 bg-gray-200 rounded-xl" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {attachments.map(att => {
                      const isImage = att.file_type?.startsWith('image/') || 
                                     /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.file_name)
                      
                      return (
                        <div key={att.id} className="group relative">
                          {isImage ? (
                            // Image thumbnail
                            <div 
                              onClick={() => setLightboxImage(att.file_url)}
                              className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            >
                              <img 
                                src={att.file_url} 
                                alt={att.file_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                                }}
                              />
                              {/* Delete button overlay */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteAttachment(att.id) }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            // File card
                            <div className="aspect-square rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors p-2 flex flex-col items-center justify-center relative group">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                                <Paperclip size={16} className="text-blue-600" />
                              </div>
                              <p className="text-xs font-medium text-gray-800 truncate w-full text-center px-1" title={att.file_name}>
                                {att.file_name}
                              </p>
                              <p className="text-[10px] text-gray-400">{(att.file_size / 1024).toFixed(1)} KB</p>
                              {/* Download button */}
                              <a 
                                href={att.file_url} 
                                download={att.file_name}
                                className="absolute top-1 right-1 p-1 bg-blue-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download size={12} />
                              </a>
                              {/* Delete button */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteAttachment(att.id) }}
                                className="absolute top-1 left-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT — Comments & activity ───────────────────────────────────── */}
          <div className="w-[300px] shrink-0 border-l border-gray-100 flex flex-col">
            {/* header + tabs */}
            <div className="px-4 pt-4 pb-0 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} className="text-gray-500" />
                <p className="text-sm font-semibold text-gray-800">Activity</p>
              </div>
              <div className="flex border-b border-gray-100">
                {(['all', 'comments', 'activity'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActivityTab(tab)}
                    className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                      activityTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'comments' ? 'Comments' : 'History'}
                  </button>
                ))}
              </div>
            </div>

            {/* comment input */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <textarea
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          addComment()
                        }
                      }}
                      placeholder="Write a comment..."
                      rows={2}
                      className="w-full px-3 pt-2 pb-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none"
                    />
                    {/* File previews */}
                    {commentFiles.length > 0 && (
                      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                        {commentFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700">
                            <Paperclip size={10} />
                            <span className="truncate max-w-[80px]">{f.name}</span>
                            <button onClick={() => setCommentFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                              <X size={9} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between px-2 pb-1.5">
                      <label className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors p-1 rounded" title="Attach file">
                        <Paperclip size={13} />
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          ref={commentFileRef}
                          onChange={e => {
                            const files = Array.from(e.target.files || [])
                            setCommentFiles(prev => [...prev, ...files])
                            e.target.value = ''
                          }}
                        />
                      </label>
                      <button
                        onClick={addComment}
                        disabled={uploadingComment || (!newComment.trim() && commentFiles.length === 0)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {uploadingComment ? '...' : <><Send size={10} /> Send</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* activity feed */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {loading ? (
                <>
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-start gap-2 animate-pulse">
                      <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </>
              ) : filteredActivity.length > 0 ? (
                filteredActivity.map((item, i) => (
                  <div key={item.id || i} className={`flex items-start gap-2 group ${
                    item.type === 'activity' ? 'opacity-80' : ''
                  }`}>
                    {item.type === 'comment' ? (
                      <Avatar name={item.user} px={26} />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Clock size={11} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {item.type === 'comment' ? (
                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-800">{item.user}</p>
                            {item.userId === user?.id && (
                              <button
                                onClick={() => deleteComment(item.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity shrink-0 -mt-0.5"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{item.text}</p>
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {item.attachments.map((att: any) => {
                                const isImage = att.file_type?.startsWith('image/') || 
                                               /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.file_name)
                                
                                if (isImage) {
                                  // Image thumbnail
                                  return (
                                    <div
                                      key={att.id}
                                      onClick={() => setLightboxImage(att.file_url)}
                                      className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all group"
                                    >
                                      <img 
                                        src={att.file_url} 
                                        alt={att.file_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E?%3C/text%3E%3C/svg%3E'
                                        }}
                                      />
                                      {/* View indicator on hover */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Eye size={16} className="text-white" />
                                      </div>
                                    </div>
                                  )
                                } else {
                                  // File link
                                  return (
                                    <a
                                      key={att.id}
                                      href={att.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-[10px] text-blue-600 hover:bg-blue-100 transition-colors"
                                    >
                                      <Paperclip size={10} />
                                      <span className="truncate max-w-[100px]" title={att.file_name}>{att.file_name}</span>
                                      <Download size={9} className="ml-0.5" />
                                    </a>
                                  )
                                }
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs leading-snug">
                          <span className="font-medium text-gray-700">{item.user}</span>
                          {' '}
                          <span className="text-gray-500">{item.text}</span>
                        </p>
                      )}
                      {item.created_at && (
                        <p className="text-[10px] text-gray-400 mt-0.5 px-1">{formatActivityDate(item.created_at)}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-400">No {activityTab === 'all' ? 'activity' : activityTab} yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════ FOOTER ══════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 shrink-0 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-2">
            {task.status !== 'done' && (
              <button
                onClick={markAsDone}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                <Check size={14} /> Done
              </button>
            )}
            <button
              onClick={deleteCard}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-sm font-semibold rounded-lg transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* ── Labels popup ─────────────────────────────────────────────────────── */}
      {showLabelsMenu && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-[1010]"
          onClick={() => setShowLabelsMenu(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-80" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Labels</p>
              <button onClick={() => setShowLabelsMenu(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
            </div>
            
            {!creatingLabel ? (
              <>
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" value={labelSearch} onChange={e => setLabelSearch(e.target.value)}
                    placeholder="Search labels..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto mb-3">
                  {boardLabels.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 mb-2">No labels yet</p>
                      <p className="text-xs text-gray-400">Create your first label below</p>
                    </div>
                  ) : filteredLabels.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No labels found</p>
                  ) : (
                    filteredLabels.map(l => {
                      const isSelected = selectedLabel === l.id
                      return (
                        <button
                          key={l.id}
                          onClick={() => changeLabel(l.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 px-3 py-1.5 rounded text-[11px] font-bold text-center text-white" style={{ background: l.color }}>
                            {l.name || 'Unnamed Label'}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
                <button
                  onClick={() => setCreatingLabel(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  <Plus size={14} />
                  Create New Label
                </button>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Label Name</label>
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    placeholder="e.g., Bug, Feature, Urgent"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-700 mb-2 block">Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {['#F87168', '#FEA362', '#E2B203', '#94C748', '#579DFF', '#8B5CF6', '#EC4899', '#6B7280'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={`w-full aspect-square rounded-lg transition-all ${newLabelColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCreatingLabel(false)
                      setNewLabelName('')
                      setNewLabelColor('#E2B203')
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewLabel}
                    disabled={!newLabelName.trim()}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Date picker popup ────────────────────────────────────────────────── */}
      {showDueDatePicker && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-[1010] p-4"
          onClick={() => setShowDueDatePicker(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-[340px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
              <p className="text-base font-semibold text-gray-800">Dates</p>
              <button onClick={() => setShowDueDatePicker(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {/* Calendar navigation */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={jumpToStart} className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronsLeft size={16} className="text-gray-500" />
                </button>
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <div className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
                <button onClick={jumpToEnd} className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <ChevronsRight size={16} className="text-gray-500" />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="mb-4">
                <div className="grid grid-cols-7 gap-0 mb-1">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-[11px] font-semibold text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0">
                  {getDaysInMonth(currentMonth).map((dayInfo, idx) => {
                    const { day, isCurrentMonth } = dayInfo
                    return (
                      <button
                        key={idx}
                        onClick={() => selectDay(day, isCurrentMonth)}
                        className={`
                          h-9 text-sm rounded transition-colors flex items-center justify-center
                          ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                          ${isToday(day, isCurrentMonth) ? 'bg-blue-50 font-semibold' : ''}
                          ${isSelected(day, isCurrentMonth) ? 'bg-blue-600 text-white font-semibold hover:bg-blue-700' : 'hover:bg-gray-100'}
                        `}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Start date */}
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 mb-2 font-medium">
                  <input
                    type="checkbox"
                    checked={hasStartDate}
                    onChange={e => setHasStartDate(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  Start date
                </label>
                {hasStartDate && (
                  <input
                    type="text"
                    placeholder="M/D/YYYY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Due date */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 mb-2 font-medium">
                  <input
                    type="checkbox"
                    checked={!!selectedDate}
                    onChange={e => {
                      if (!e.target.checked) setSelectedDate(null)
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  Due date
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={selectedDate ? `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}/${selectedDate.getFullYear()}` : ''}
                    placeholder="M/D/YYYY"
                    readOnly
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={selectedTime}
                    onChange={e => setSelectedTime(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {timeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recurring */}
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2 font-medium">Recurring</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>Never</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>

              {/* Reminder */}
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2 font-medium">Set due date reminder</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>None</option>
                  <option>At time of due date</option>
                  <option>5 minutes before</option>
                  <option>10 minutes before</option>
                  <option>15 minutes before</option>
                  <option>1 hour before</option>
                  <option>1 day before</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Reminders will be sent to all members and watchers of this card.</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={saveDueDate} 
                  disabled={!selectedDate}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                {dueDate && (
                  <button 
                    onClick={removeDueDate} 
                    className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══ UNSAVED CHANGES DIALOG ════════════════════════════════════════════════ */}
      {showUnsavedDialog && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-[380px] p-6">
            <h3 className="text-[17px] font-bold text-gray-900 mb-1">Unsaved changes</h3>
            <p className="text-sm text-gray-500 mb-6">
              You have unsaved changes to the description. Would you like to save them before closing?
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setShowUnsavedDialog(false)
                  await handleSave()
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Save &amp; Close
              </button>
              <button
                onClick={() => {
                  setShowUnsavedDialog(false)
                  setIsDirty(false)
                  onClose()
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Discard &amp; Close
              </button>
            </div>
            <button
              onClick={() => setShowUnsavedDialog(false)}
              className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Continue editing
            </button>
          </div>
        </div>
      )}

      {/* ── IMAGE LIGHTBOX ─────────────────────────────────────────────────── */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[2000]" 
          onClick={() => setLightboxImage(null)}
        >
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Full size"
            className="max-w-[90%] max-h-[90%] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
