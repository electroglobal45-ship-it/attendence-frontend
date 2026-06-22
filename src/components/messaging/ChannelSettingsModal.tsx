'use client'

import { useState, useEffect } from 'react'
import { X, Settings, Hash, Lock, Trash2, Archive, Bell, BellOff } from 'lucide-react'

interface ChannelSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  channelId?: string
  conversationId?: string
  channelData?: {
    id: string
    name: string
    topic?: string
    type: 'public' | 'private'
    is_archived: boolean
  }
  onUpdate?: () => void
}

export default function ChannelSettingsModal({
  isOpen,
  onClose,
  channelId,
  conversationId,
  channelData,
  onUpdate,
}: ChannelSettingsModalProps) {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [loading, setLoading] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && channelData) {
      setName(channelData.name)
      setTopic(channelData.topic || '')
      setIsPrivate(channelData.type === 'private')
      
      const userRole = localStorage.getItem('userRole')
      setCurrentUserRole(userRole)
    }
  }, [isOpen, channelData])

  const handleSave = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const endpoint = channelId
        ? `${BACKEND_URL}/api/v1/channels/${channelId}`
        : `${BACKEND_URL}/api/v1/conversations/${conversationId}`

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          topic,
          type: isPrivate ? 'private' : 'public',
        }),
      })

      if (response.ok) {
        alert('Settings saved successfully!')
        onUpdate?.()
        onClose()
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('An error occurred while saving settings')
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this channel?')) return

    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/api/v1/channels/${channelId}/archive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        alert('Channel archived successfully!')
        onUpdate?.()
        onClose()
      }
    } catch (error) {
      console.error('Failed to archive channel:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to DELETE this channel? This action cannot be undone!')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const endpoint = channelId
        ? `${BACKEND_URL}/api/v1/channels/${channelId}`
        : `${BACKEND_URL}/api/v1/conversations/${conversationId}`

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        alert('Channel deleted successfully!')
        onUpdate?.()
        onClose()
      }
    } catch (error) {
      console.error('Failed to delete channel:', error)
    }
  }

  const handleToggleNotifications = () => {
    setNotifications(!notifications)
    // TODO: Save notification preference to backend
    alert(notifications ? 'Notifications muted' : 'Notifications enabled')
  }

  if (!isOpen) return null

  const canManageChannel = currentUserRole === 'admin' || currentUserRole === 'hr'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Channel Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Channel Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Channel Name
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="channel-name"
              />
            </div>
          </div>

          {/* Channel Topic */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Channel Topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="What's this channel about?"
            />
          </div>

          {/* Channel Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Channel Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                  className="w-4 h-4 text-blue-600"
                />
                <Hash className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">Public</div>
                  <div className="text-sm text-gray-500">
                    Anyone in the workspace can join
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <Lock className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">Private</div>
                  <div className="text-sm text-gray-500">
                    Only invited members can join
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Notifications
            </label>
            <button
              onClick={handleToggleNotifications}
              className={`w-full flex items-center justify-between p-4 border rounded-lg transition-colors ${
                notifications
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {notifications ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-600" />
                )}
                <div className="text-left">
                  <div className="font-medium text-gray-900">
                    {notifications ? 'Notifications On' : 'Notifications Off'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {notifications
                      ? 'You will receive notifications for this channel'
                      : 'Notifications are muted for this channel'}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Danger Zone */}
          {canManageChannel && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Danger Zone</h3>
              <div className="space-y-2">
                <button
                  onClick={handleArchive}
                  className="w-full flex items-center justify-between p-3 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Archive className="w-5 h-5 text-yellow-600" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Archive Channel</div>
                      <div className="text-sm text-gray-500">
                        Hide this channel from the sidebar
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-between p-3 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Delete Channel</div>
                      <div className="text-sm text-gray-500">
                        Permanently delete this channel
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
