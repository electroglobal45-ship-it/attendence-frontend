'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSocket } from '@/hooks/useSocket'
import { getBackendUrl } from '@/lib/socket'
import { Notification } from '@/types/notification.types'
import NotificationItem from './NotificationItem'

export default function NotificationBell() {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = getBackendUrl()
      const res = await fetch(`${BACKEND_URL}/api/v1/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.data?.unread_count !== undefined) {
        setUnreadCount(data.data.unread_count)
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = getBackendUrl()
      const res = await fetch(`${BACKEND_URL}/api/v1/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.data) {
        setNotifications(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = getBackendUrl()
      await fetch(`${BACKEND_URL}/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      // Broadcast via socket
      if (socket && isConnected) {
        socket.emit('notification:read', {
          notification_id: notificationId,
          user_id: user?.id
        })
      }
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = getBackendUrl()
      await fetch(`${BACKEND_URL}/api/v1/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)

      // Broadcast via socket
      if (socket && isConnected) {
        socket.emit('notification:read-all', { user_id: user?.id })
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchUnreadCount()
    }
  }, [user])

  // Real-time socket listeners
  useEffect(() => {
    if (!socket || !isConnected || !user) return

    // Listen for new notifications
    socket.on('notification:new', (notification: any) => {
      setUnreadCount(prev => prev + 1)
      setNotifications(prev => [notification, ...prev])
    })

    // Listen for notification marked as read
    socket.on('notification:marked-read', (data: any) => {
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === data.notification_id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
    })

    // Listen for all marked as read
    socket.on('notification:all-marked-read', () => {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
    })

    return () => {
      socket.off('notification:new')
      socket.off('notification:marked-read')
      socket.off('notification:all-marked-read')
    }
  }, [socket, isConnected, user])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && user && notifications.length === 0) {
      // Only fetch if notifications are empty (first time)
      fetchNotifications()
    }
  }, [isOpen, user])

  if (!user) return null

  return (
    <div className="relative z-[200]" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-[#2d1b4e] hover:bg-purple-50 rounded-full transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell size={22} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#2d1b4e] to-[#1a0f2e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-3 w-[90vw] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col overflow-hidden"
          style={{ zIndex: 99999 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#2d1b4e] to-[#1a0f2e] text-white">
            <div className="flex items-center gap-2">
              <Bell size={20} />
              <h3 className="font-semibold text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-medium transition-all backdrop-blur-sm"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 bg-gray-50">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-[#2d1b4e]/20 border-t-[#2d1b4e] rounded-full animate-spin"></div>
                <p className="text-gray-500 mt-3 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell size={28} className="text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No notifications yet</p>
                <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onMarkAsRead={markAsRead}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
