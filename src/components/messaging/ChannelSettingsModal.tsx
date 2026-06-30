'use client'

import { useState, useEffect } from 'react'
import { X, Settings, Hash, Lock, Trash2, Archive, Bell, BellOff } from 'lucide-react'
import { getBackendUrl } from '@/lib/socket'

const BACKEND_URL = getBackendUrl()

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
  const [onlyAdminsCanMessage, setOnlyAdminsCanMessage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && channelData) {
      setName(channelData.name)
      setTopic(channelData.topic || '')
      setIsPrivate(channelData.type === 'private')
      
      const userRole = localStorage.getItem('userRole')
      setCurrentUserRole(userRole)

      if (channelId) {
        const storedSetting = localStorage.getItem(`channel_only_admins_${channelId}`)
        setOnlyAdminsCanMessage(storedSetting === 'true' || (channelData as any).only_admins_can_message === true)
      }
    }
  }, [isOpen, channelData, channelId])

  const handleSave = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const endpoint = channelId
        ? `${BACKEND_URL}/api/v1/channels/${channelId}`
        : `${BACKEND_URL}/api/v1/conversations/${conversationId}`

      if (channelId) {
        localStorage.setItem(`channel_only_admins_${channelId}`, String(onlyAdminsCanMessage))
      }

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
          only_admins_can_message: onlyAdminsCanMessage,
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-0 sm:p-4 animate-fade-in font-sans">
      <div className="bg-[#1E0A2E] border border-[#4A1F6F]/60 text-white w-full h-full sm:h-auto sm:max-w-xl sm:max-h-[85vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#4A1F6F]/40 bg-[#150825] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#D9A441]" />
            <h2 className="text-base sm:text-lg font-bold text-white">Channel Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#2D1152] text-purple-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Channel Name */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-2">
              Channel Name
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#2D1152] border border-[#4A1F6F]/60 rounded-xl text-sm text-white placeholder-purple-400/60 focus:outline-none focus:border-[#D9A441]"
                placeholder="channel-name"
              />
            </div>
          </div>

          {/* Channel Topic */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-2">
              Channel Topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#2D1152] border border-[#4A1F6F]/60 rounded-xl text-sm text-white placeholder-purple-400/60 focus:outline-none focus:border-[#D9A441] resize-none"
              rows={3}
              placeholder="What's this channel about?"
            />
          </div>

          {/* Channel Type */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-3">
              Channel Type
            </label>
            <div className="space-y-2.5">
              <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${
                !isPrivate ? 'border-[#D9A441]/60 bg-[#2D1152]' : 'border-[#4A1F6F]/40 bg-[#150825]/60 hover:bg-[#2D1152]/50'
              }`}>
                <input
                  type="radio"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                  className="w-4 h-4 text-[#D9A441] accent-[#D9A441] cursor-pointer"
                />
                <Hash className="w-5 h-5 text-[#D9A441]" />
                <div>
                  <div className="font-semibold text-sm text-white">Public</div>
                  <div className="text-xs text-purple-300">
                    Anyone in the workspace can join
                  </div>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-colors ${
                isPrivate ? 'border-[#D9A441]/60 bg-[#2D1152]' : 'border-[#4A1F6F]/40 bg-[#150825]/60 hover:bg-[#2D1152]/50'
              }`}>
                <input
                  type="radio"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                  className="w-4 h-4 text-[#D9A441] accent-[#D9A441] cursor-pointer"
                />
                <Lock className="w-5 h-5 text-[#D9A441]" />
                <div>
                  <div className="font-semibold text-sm text-white">Private</div>
                  <div className="text-xs text-purple-300">
                    Only invited members can join
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Posting Permissions (WhatsApp Channel style) */}
          {channelId && (
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-3">
                Posting Permissions
              </label>
              <label className={`flex items-center justify-between p-3.5 sm:p-4 border rounded-xl cursor-pointer transition-colors ${
                onlyAdminsCanMessage ? 'border-[#D9A441]/60 bg-[#2D1152]' : 'border-[#4A1F6F]/40 bg-[#150825]/60 hover:bg-[#2D1152]/50'
              }`}>
                <div className="flex items-center gap-3 pr-2">
                  <div className="w-9 h-9 rounded-lg bg-[#4A1F6F] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    🔒
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs sm:text-sm">Only Admins & Sub-Admins can message</div>
                    <div className="text-[11px] sm:text-xs text-purple-300 mt-0.5 leading-relaxed">
                      When enabled, normal members can only read messages (like WhatsApp Channels).
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={onlyAdminsCanMessage}
                  onChange={(e) => setOnlyAdminsCanMessage(e.target.checked)}
                  className="w-5 h-5 text-[#D9A441] accent-[#D9A441] rounded shrink-0 cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Notifications */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-purple-200 mb-3">
              Notifications
            </label>
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`w-full flex items-center justify-between p-3.5 border rounded-xl transition-colors cursor-pointer ${
                notifications
                  ? 'border-emerald-500/40 bg-emerald-950/20'
                  : 'border-[#4A1F6F]/40 bg-[#150825]/60'
              }`}
            >
              <div className="flex items-center gap-3">
                {notifications ? (
                  <Bell className="w-5 h-5 text-emerald-400" />
                ) : (
                  <BellOff className="w-5 h-5 text-purple-400" />
                )}
                <div className="text-left">
                  <div className="font-semibold text-xs sm:text-sm text-white">
                    {notifications ? 'Notifications On' : 'Notifications Off'}
                  </div>
                  <div className="text-[11px] sm:text-xs text-purple-300">
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
            <div className="pt-5 border-t border-[#4A1F6F]/40">
              <h3 className="text-xs sm:text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleArchive}
                  className="w-full flex items-center justify-between p-3 border border-amber-500/30 bg-amber-950/10 rounded-xl hover:bg-amber-950/30 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Archive className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs sm:text-sm text-amber-200">Archive Channel</div>
                      <div className="text-[11px] sm:text-xs text-amber-300/70">
                        Hide this channel from the sidebar
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full flex items-center justify-between p-3 border border-red-500/30 bg-red-950/10 rounded-xl hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs sm:text-sm text-red-200">Delete Channel</div>
                      <div className="text-[11px] sm:text-xs text-red-300/70">
                        Permanently delete this channel
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer (Fixed at bottom) */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-[#4A1F6F]/40 bg-[#150825] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-purple-300 hover:text-white hover:bg-[#2D1152] rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-[#D9A441] hover:bg-[#C48B2F] text-[#1E0A2E] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
