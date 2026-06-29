'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Bell, Calendar, AlertCircle, Users } from 'lucide-react'
import { getBackendUrl } from '@/lib/socket'
import { useSocket } from '@/hooks/useSocket'
import type { CreateNotificationPayload, NotificationType, NotificationPriority } from '@/types/notification.types'

interface CreateNotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function CreateNotificationModal({ isOpen, onClose }: CreateNotificationModalProps) {
  const { socket, isConnected } = useSocket()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotificationType>('general')
  const [meetingLink, setMeetingLink] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = getBackendUrl()
      const res = await fetch(`${BACKEND_URL}/api/v1/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.data?.employees) {
        setUsers(data.data.employees)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !message || selectedUsers.length === 0) {
      alert('Please fill in all required fields and select at least one recipient')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const payload: CreateNotificationPayload = {
        title,
        message,
        type,
        recipient_ids: selectedUsers,
        priority: 'normal', // Default priority
        ...(meetingLink && { meeting_link: meetingLink }),
        ...(scheduledFor && { scheduled_for: new Date(scheduledFor).toISOString() })
      }

      const BACKEND_URL = getBackendUrl()
      const res = await fetch(`${BACKEND_URL}/api/v1/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        // Send real-time notification via socket
        if (socket && isConnected && data.data?.notification) {
          socket.emit('notification:send', {
            recipient_ids: selectedUsers,
            notification: {
              id: data.data.notification.id,
              notification_id: data.data.notification.id,
              is_read: false,
              created_at: data.data.notification.created_at,
              notifications: data.data.notification
            }
          })
        }

        // Reset form
        setTitle('')
        setMessage('')
        setType('general')
        setMeetingLink('')
        setScheduledFor('')
        setSelectedUsers([])
        onClose()
      } else {
        alert(data.error || 'Failed to create notification')
      }
    } catch (err) {
      console.error('Failed to create notification:', err)
      alert('Failed to create notification')
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAll = () => {
    setSelectedUsers(users.map(u => u.id))
  }

  const deselectAll = () => {
    setSelectedUsers([])
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" style={{ zIndex: 99999 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#2d1b4e] to-[#1a0f2e] border-b border-purple-900/20">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Bell size={22} />
            </div>
            Create Notification
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent transition-all"
              placeholder="Meeting reminder, announcement, etc."
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent transition-all"
              placeholder="Notification details..."
              rows={4}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NotificationType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent transition-all"
            >
              <option value="general">General</option>
              <option value="meeting">Meeting</option>
              <option value="announcement">Announcement</option>
              <option value="reminder">Reminder</option>
              <option value="task">Task</option>
            </select>
          </div>

          {/* Meeting Link (optional) */}
          {type === 'meeting' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Link
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent transition-all"
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          {/* Scheduled For (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule For (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d1b4e] focus:border-transparent transition-all"
            />
          </div>

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Recipients <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-[#2d1b4e] hover:text-[#1a0f2e] font-medium transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2">
              {loadingUsers ? (
                <div className="text-center text-gray-500 py-4">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No users found</div>
              ) : (
                users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="w-4 h-4 text-[#2d1b4e] border-gray-300 rounded focus:ring-[#2d1b4e] transition-all"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {user.role}
                    </span>
                  </label>
                ))
              )}
            </div>

            <p className="text-xs text-gray-500 mt-1">
              {selectedUsers.length} user(s) selected
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedUsers.length === 0}
              className="px-5 py-2.5 text-white bg-gradient-to-r from-[#2d1b4e] to-[#1a0f2e] hover:from-[#3d2b5e] hover:to-[#2a1f3e] rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Bell size={18} />
                  Create Notification
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
