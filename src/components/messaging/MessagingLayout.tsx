'use client'

import { useEffect, useState } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { MessageSquare, Menu, Hash, Lock } from 'lucide-react'
import ChatArea from './ChatArea'
import ThreadPanel from './ThreadPanel'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { PresenceIndicator } from './PresenceIndicator'
import { getBackendUrl } from '@/lib/socket'

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

      const BACKEND_URL = getBackendUrl()

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
    <div className="flex h-full bg-[#150825] overflow-hidden">

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {hasActiveChat ? (
          <ChatArea />
        ) : (
          <InboxState />
        )}
      </main>

      {/* Right Panel - Thread Replies (if open) */}
      {isThreadPanelOpen && (
        <aside className="w-[380px] flex-shrink-0 border-l border-[#4A1F6F]/40 bg-[#1E0A2E]">
          <ThreadPanel />
        </aside>
      )}
    </div>
  )
}

function InboxState() {
  const channels = useMessagingStore((state) => state.channels)
  const conversations = useMessagingStore((state) => state.conversations)
  const unreadChannels = useMessagingStore((state) => state.unreadChannels)
  const unreadConversations = useMessagingStore((state) => state.unreadConversations)
  const setActiveChannel = useMessagingStore((state) => state.setActiveChannel)
  const setActiveConversation = useMessagingStore((state) => state.setActiveConversation)
  const setOpen = useSidebarStore((state) => state.setOpen)

  const publicChannels = channels.filter(ch => ch.type === 'public' && !ch.is_archived)
  const privateChannels = channels.filter(ch => ch.type === 'private' && !ch.is_archived)
  const hasAnyContent = publicChannels.length > 0 || privateChannels.length > 0 || conversations.length > 0

  return (
    <div className="flex-1 flex flex-col h-full bg-[#150825]">
      {/* Mobile Header */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-[#4A1F6F]/40 bg-[#1E0A2E] lg:hidden flex-shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 text-purple-300 hover:text-white hover:bg-[#2D1152] rounded-lg cursor-pointer transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-bold text-white">Inbox</h1>
      </header>

      {/* Desktop Inbox Header */}
      <div className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-[#4A1F6F]/40 bg-[#1E0A2E] flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          <p className="text-sm text-purple-300 mt-0.5">Select a channel or conversation to start messaging</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasAnyContent ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#2D1152] mb-4">
              <MessageSquare className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-purple-300 text-sm">No channels or conversations yet</p>
          </div>
        ) : (
          <div className="py-6">

            {/* Channels */}
            {(publicChannels.length > 0 || privateChannels.length > 0) && (
              <section className="mb-8">
                <h2 className="px-6 lg:px-8 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">
                  Channels
                </h2>
                <div className="space-y-0.5">
                  {[...publicChannels, ...privateChannels].map(channel => {
                    const unread = unreadChannels[channel.id] || 0
                    return (
                      <button
                        key={channel.id}
                        onClick={() => setActiveChannel(channel.id)}
                        className="w-full flex items-center gap-3 px-6 lg:px-8 py-3 hover:bg-[#2D1152]/40 transition-colors group"
                      >
                        <span className="flex-shrink-0 text-purple-400 group-hover:text-purple-200 transition-colors">
                          {channel.type === 'private'
                            ? <Lock className="w-4 h-4" />
                            : <Hash className="w-4 h-4" />
                          }
                        </span>
                        <span className={`flex-1 text-left text-sm truncate transition-colors ${unread > 0 ? 'font-semibold text-white' : 'font-medium text-purple-200 group-hover:text-white'}`}>
                          {channel.name}
                        </span>
                        {unread > 0 && (
                          <span className="flex-shrink-0 bg-[#D9A441] text-[#1E0A2E] text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Direct Messages */}
            {conversations.length > 0 && (
              <section>
                <h2 className="px-6 lg:px-8 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">
                  Direct Messages
                </h2>
                <div className="space-y-0.5">
                  {conversations.map(conv => {
                    const unread = unreadConversations[conv.id] || 0
                    const otherUser = conv.other_user
                    const displayName = conv.type === 'direct'
                      ? otherUser?.name || 'Direct Message'
                      : 'Group Chat'
                    const initials = displayName.slice(0, 2).toUpperCase()

                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConversation(conv.id)}
                        className="w-full flex items-center gap-3 px-6 lg:px-8 py-2.5 hover:bg-[#2D1152]/40 transition-colors group"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#4A1F6F] border border-[#4A1F6F]/30 flex items-center justify-center">
                            <span className="text-xs font-semibold text-white">{initials}</span>
                          </div>
                          {otherUser?.id && (
                            <span className="absolute -bottom-0.5 -right-0.5">
                              <PresenceIndicator userId={otherUser.id} size="sm" />
                            </span>
                          )}
                        </div>

                        <span className={`flex-1 text-left text-sm truncate transition-colors ${unread > 0 ? 'font-semibold text-white' : 'font-medium text-purple-200 group-hover:text-white'}`}>
                          {displayName}
                        </span>

                        {unread > 0 && (
                          <span className="flex-shrink-0 bg-[#D9A441] text-[#1E0A2E] text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
