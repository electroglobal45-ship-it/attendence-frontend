'use client'

import { useEffect, useState } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { MessageSquare } from 'lucide-react'
import ChatArea from './ChatArea'
import ThreadPanel from './ThreadPanel'

export default function MessagingLayout() {
  const [isMounted, setIsMounted] = useState(false)
  const isThreadPanelOpen = useMessagingStore((state) => state.isThreadPanelOpen)
  const activeChannelId = useMessagingStore((state) => state.activeChannelId)
  const activeConversationId = useMessagingStore((state) => state.activeConversationId)
  const setChannels = useMessagingStore((state) => state.setChannels)
  const setConversations = useMessagingStore((state) => state.setConversations)

  const hasActiveChat = activeChannelId || activeConversationId

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
    loadChannelsAndConversations()
  }, [])

  const loadChannelsAndConversations = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

      // Load channels
      const channelsRes = await fetch(`${BACKEND_URL}/api/v1/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const channelsData = await channelsRes.json()
      if (channelsData.success && channelsData.data?.channels) {
        setChannels(channelsData.data.channels)
      }

      // Load conversations
      const conversationsRes = await fetch(`${BACKEND_URL}/api/v1/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const conversationsData = await conversationsRes.json()
      if (conversationsData.success && conversationsData.data) {
        setConversations(Array.isArray(conversationsData.data) ? conversationsData.data : [])
      }
    } catch (error) {
      console.error('Failed to load channels and conversations:', error)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <div className="flex h-full bg-white overflow-hidden">

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {hasActiveChat ? (
          <ChatArea />
        ) : (
          <EmptyState />
        )}
      </main>

      {/* Right Panel - Thread Replies (if open) */}
      {isThreadPanelOpen && (
        <aside className="w-[380px] flex-shrink-0 border-l border-gray-200 bg-white">
          <ThreadPanel />
        </aside>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
          <MessageSquare className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Welcome to Messages
        </h2>
        <p className="text-gray-600 mb-6">
          Select a channel or conversation from the sidebar to get started.
        </p>
      </div>
    </div>
  )
}
