'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMessagingStore } from '@/store/messaging.store'
import { MessageSquare, ArrowLeft } from 'lucide-react'
import ChannelSidebar from './ChannelSidebar'
import ChatArea from './ChatArea'
import ThreadPanel from './ThreadPanel'

export default function MessagingLayout() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const isThreadPanelOpen = useMessagingStore((state) => state.isThreadPanelOpen)
  const activeChannelId = useMessagingStore((state) => state.activeChannelId)
  const activeConversationId = useMessagingStore((state) => state.activeConversationId)
  const setChannels = useMessagingStore((state) => state.setChannels)
  const setConversations = useMessagingStore((state) => state.setConversations)

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
    // Get user role from localStorage
    const role = localStorage.getItem('userRole')
    setUserRole(role)
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

  const hasActiveChat = activeChannelId || activeConversationId

  const handleBackToDashboard = () => {
    // Navigate based on user role
    if (userRole === 'admin' || userRole === 'hr') {
      router.push('/dashboard')
    } else {
      router.push('/home')
    }
  }

  return (
    <div className="flex h-full bg-white">
      {/* Top Header Bar - Back Button */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 flex items-center px-4 z-10">
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </button>
      </div>

      {/* Main Content - offset by header */}
      <div className="flex w-full pt-12">
        {/* Left Sidebar - Channels & DMs (260px) */}
        <aside className="w-[260px] flex-shrink-0 border-r border-gray-200 bg-white">
          <ChannelSidebar />
        </aside>

        {/* Main Chat Area */}
        <main className={`flex-1 flex flex-col min-w-0 ${isThreadPanelOpen ? '' : ''}`}>
          {hasActiveChat ? (
            <ChatArea />
          ) : (
            <EmptyState />
          )}
        </main>

        {/* Right Panel - Thread Replies (if open) */}
        {isThreadPanelOpen && (
          <aside className="w-[400px] flex-shrink-0 border-l border-gray-200 bg-white">
            <ThreadPanel />
          </aside>
        )}
      </div>
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
          Select a channel or start a conversation to begin messaging with your team.
        </p>
        <div className="space-y-2 text-sm text-gray-500 text-left">
          <div className="flex items-start gap-2">
            <span className="font-bold">💬</span>
            <span>Click on a channel to join the conversation</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">📨</span>
            <span>Start a direct message with a teammate</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">🧵</span>
            <span>Reply in threads to keep discussions organized</span>
          </div>
        </div>
      </div>
    </div>
  )
}
