'use client'

import { useState, useEffect } from 'react'
import { X, Pin, Trash2 } from 'lucide-react'
import { getBackendUrl } from '@/lib/socket'

const BACKEND_URL = getBackendUrl()

interface PinnedMessage {
  id: string
  content: string
  sender: {
    id: string
    name: string
    avatar_url?: string
  }
  created_at: string
  pinned_at: string
  pinned_by: {
    id: string
    name: string
  }
}

interface PinnedMessagesModalProps {
  isOpen: boolean
  onClose: () => void
  channelId?: string
  conversationId?: string
}

export default function PinnedMessagesModal({
  isOpen,
  onClose,
  channelId,
  conversationId,
}: PinnedMessagesModalProps) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const getLoggedUserId = () => {
        if (typeof window === 'undefined') return null
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser)
            if (parsed?.id) return String(parsed.id)
          } catch (e) {
            console.error(e)
          }
        }
        return localStorage.getItem('userId')
      }
      const userId = getLoggedUserId()
      setCurrentUserId(userId)
      fetchPinnedMessages()
    }
  }, [isOpen, channelId, conversationId])

  const fetchPinnedMessages = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const endpoint = channelId
        ? `${BACKEND_URL}/api/v1/messages/channels/${channelId}/pinned`
        : `${BACKEND_URL}/api/v1/messages/conversations/${conversationId}/pinned`

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success && data.data?.messages) {
        setPinnedMessages(data.data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch pinned messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnpin = async (messageId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${BACKEND_URL}/api/v1/messages/${messageId}/unpin`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setPinnedMessages(pinnedMessages.filter((msg) => msg.id !== messageId))
      }
    } catch (error) {
      console.error('Failed to unpin message:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Pinned Messages</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading pinned messages...</div>
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Pin className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Pinned Messages
              </h3>
              <p className="text-gray-500">
                Pin important messages to find them easily later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pinnedMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Sender Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">
                            {message.sender.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Message Content */}
                      <p className="text-gray-800 whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

                      {/* Pinned Info */}
                      <div className="mt-2 text-xs text-gray-500">
                        Pinned by {message.pinned_by.name} on{' '}
                        {new Date(message.pinned_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Unpin Button */}
                    <button
                      onClick={() => handleUnpin(message.id)}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Unpin message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            💡 Tip: Right-click on any message to pin or unpin it.
          </p>
        </div>
      </div>
    </div>
  )
}
