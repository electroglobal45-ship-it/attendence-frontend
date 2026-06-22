'use client'

import { useState, useEffect } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { MessageSquare, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import ChannelSidebar from './ChannelSidebar'
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

  // Show the channel sidebar panel only when user explicitly opens it.
  // When arriving from a sidebar click (active chat already set), default to hidden.
  const [showChannelPanel, setShowChannelPanel] = useState(false)

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
    <div className="flex h-full bg-white relative overflow-hidden">

      {/* Toggle button — always visible top-left */}
      <button
        onClick={() => setShowChannelPanel((prev) => !prev)}
        title={showChannelPanel ? 'Hide channel list' : 'Show channel list'}
        className="absolute top-3 left-3 z-20 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 shadow-sm transition-all"
      >
        {showChannelPanel
          ? <PanelLeftClose size={16} />
          : <PanelLeftOpen size={16} />
        }
      </button>

      {/* Left Channel/DM Panel — shown only when toggled open */}
      {showChannelPanel && (
        <aside className="w-[240px] flex-shrink-0 border-r border-gray-200 bg-white">
          <ChannelSidebar />
        </aside>
      )}

      {/* Main Chat Area */}
      <main className={`flex-1 flex flex-col min-w-0 ${showChannelPanel ? '' : 'pl-0'}`}>
        {hasActiveChat ? (
          <ChatArea />
        ) : (
          <EmptyState onOpenPanel={() => setShowChannelPanel(true)} />
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

function EmptyState({ onOpenPanel }: { onOpenPanel: () => void }) {
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
          Select a channel or conversation from the sidebar, or open the channel list to browse.
        </p>
        <button
          onClick={onOpenPanel}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Open Channel List
        </button>
      </div>
    </div>
  )
}

