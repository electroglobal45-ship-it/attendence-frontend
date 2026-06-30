'use client'

import { useEffect, useRef, useState } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { MessageReactions } from './MessageReactions'
import { UserAvatarWithPresence } from './PresenceIndicator'
import { MessageAttachments } from './MessageAttachments'
import { Trash2, CheckCheck } from 'lucide-react'
import { socketManager } from '@/lib/socket'

interface MessageListProps {
  channelId?: string
  conversationId?: string
  isLoading?: boolean
}

export default function MessageList({ channelId, conversationId, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelMessages = useMessagingStore((state) => state.channelMessages)
  const conversationMessages = useMessagingStore((state) => state.conversationMessages)
  const searchQuery = useMessagingStore((state) => state.searchQuery)
  const isSearchOpen = useMessagingStore((state) => state.isSearchOpen)
  const clearedChats = useMessagingStore((state) => state.clearedChats)

  const rawMessages = channelId
    ? channelMessages[channelId] || []
    : conversationId
    ? conversationMessages[conversationId] || []
    : []

  // Get cleared timestamp for this chat
  const chatKey = channelId ? `channel_${channelId}` : conversationId ? `conversation_${conversationId}` : ''
  let clearedTime = clearedChats[chatKey] || 0
  if (!clearedTime && typeof window !== 'undefined' && chatKey) {
    const stored = localStorage.getItem(`cleared_chat_${chatKey}`)
    if (stored) clearedTime = parseInt(stored, 10)
  }

  // Filter out messages prior to cleared time, deleted messages, and filter by search query
  const messages = rawMessages.filter((msg) => {
    if (msg.is_deleted) return false
    if (clearedTime && msg.created_at) {
      const msgTime = new Date(msg.created_at).getTime()
      if (msgTime <= clearedTime) return false
    }
    if (isSearchOpen && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const contentMatch = msg.content?.toLowerCase().includes(query)
      const senderMatch = msg.sender?.name?.toLowerCase().includes(query)
      return contentMatch || senderMatch
    }
    return true
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (isLoading && rawMessages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <MessageSkeleton key={i} reverse={i % 3 === 0} />
        ))}
      </div>
    )
  }

  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-purple-400">
        <div className="text-center">
          <p className="text-base mb-1">
            {isSearchOpen && searchQuery ? 'No matching messages found' : 'No messages yet'}
          </p>
          <p className="text-sm text-purple-500">
            {isSearchOpen && searchQuery ? 'Try searching for something else.' : 'Be the first to send a message!'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 lg:px-6 py-4 space-y-3">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          channelId={channelId}
          conversationId={conversationId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

// Skeleton loading placeholder
function MessageSkeleton({ reverse }: { reverse: boolean }) {
  return (
    <div className={`flex gap-3 ${reverse ? 'flex-row-reverse' : 'flex-row'} animate-pulse`}>
      <div className="w-8 h-8 rounded-full bg-[#2D1152] flex-shrink-0" />
      <div className="flex flex-col gap-1.5" style={{ maxWidth: '60%' }}>
        <div className={`h-3 w-20 rounded bg-[#2D1152] ${reverse ? 'self-end' : ''}`} />
        <div className="h-9 rounded-2xl bg-[#2D1152] w-full" />
      </div>
    </div>
  )
}

function MessageItem({ message, channelId, conversationId }: { message: any; channelId?: string; conversationId?: string }) {
  const setActiveThread = useMessagingStore((state) => state.setActiveThread)
  const setThreadPanelOpen = useMessagingStore((state) => state.setThreadPanelOpen)
  const deleteChannelMessage = useMessagingStore((state) => state.deleteChannelMessage)
  const deleteConversationMessage = useMessagingStore((state) => state.deleteConversationMessage)

  const [showMobileActions, setShowMobileActions] = useState(false)
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      setShowMobileActions(true)
    }, 450)
  }

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
  }

  const handleTouchMove = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
  }

  const handleOpenThread = () => {
    setActiveThread(message.id)
    setThreadPanelOpen(true)
  }

  if (message.is_deleted) {
    return (
      <div className="py-1 px-4 text-sm text-purple-500 italic">
        This message was deleted
      </div>
    )
  }

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

  const currentUserId = getLoggedUserId()
  const isOwnMessage = currentUserId && String(currentUserId) === String(message.sender_id)

  const handleDelete = () => {
    setShowMobileActions(false)
    if (confirm('Are you sure you want to delete this message?')) {
      // Optimistic instant local update across store
      if (channelId) {
        deleteChannelMessage(channelId, message.id)
      }
      if (conversationId) {
        deleteConversationMessage(conversationId, message.id)
      }
      // Fallback for active channel/conversation
      const state = useMessagingStore.getState()
      if (state.activeChannelId) deleteChannelMessage(state.activeChannelId, message.id)
      if (state.activeConversationId) deleteConversationMessage(state.activeConversationId, message.id)

      // Send socket update in background
      socketManager.deleteMessage(message.id)
    }
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} px-1`}>
      <div className={`flex gap-2.5 w-auto lg:w-full max-w-[85%] lg:max-w-full ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar — hide for own messages */}
        {!isOwnMessage && (
          <div className="flex-shrink-0">
            <UserAvatarWithPresence
              userId={message.sender_id}
              userName={message.sender?.name || 'Unknown User'}
              avatarUrl={message.sender?.avatar_url}
              size="md"
              showPresence={true}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 relative group">
          {/* Actions on hover (Desktop) */}
          {isOwnMessage && (
            <div className="hidden sm:flex absolute right-full top-1/2 -translate-y-1/2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity items-center bg-[#2D1152]/85 backdrop-blur rounded-lg border border-[#4A1F6F]/40 p-1">
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-[#4A1F6F]/60 rounded text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Long Press Action Popup */}
          {showMobileActions && isOwnMessage && (
            <>
              <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowMobileActions(false)} />
              <div className="absolute z-50 -top-10 right-0 bg-[#1E0A2E] border border-[#4A1F6F]/80 rounded-xl shadow-2xl p-1.5 flex items-center gap-2 animate-fade-in">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}

          {/* Bubble */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            className={`rounded-2xl px-3.5 py-2.5 select-none ${
              isOwnMessage
                ? 'bg-[#4A1F6F] text-white rounded-tr-sm'
                : 'bg-[#2D1152] text-purple-50 rounded-tl-sm'
            }`}
          >
            {/* Sender name — other's messages only */}
            {!isOwnMessage && (
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-xs text-[#D9A441]">
                  {message.sender?.name || 'Unknown User'}
                </span>
              </div>
            )}

            {/* Text */}
            <div className="break-words whitespace-pre-wrap text-sm">
              {message.content}
            </div>

            {/* Attachments */}
            {message.attachments?.length > 0 && (
              <MessageAttachments attachments={message.attachments} />
            )}

            {/* Timestamp */}
            <div className={`flex items-center gap-2 mt-1.5 text-[10px] ${isOwnMessage ? 'text-purple-300 justify-end' : 'text-purple-400'}`}>
              <span>
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {message.edited_at && (
                <span className="text-purple-400">(edited)</span>
              )}
              {isOwnMessage && (
                <span className="flex-shrink-0 ml-0.5" title={message.is_read || message.read_at ? "Read" : "Delivered"}>
                  <CheckCheck className={`w-3.5 h-3.5 ${message.is_read || message.read_at ? 'text-sky-400 stroke-[2.5]' : 'text-purple-300/80 stroke-[2]'}`} />
                </span>
              )}
            </div>
          </div>

          {/* Reactions */}
          <div className={`mt-1 ${isOwnMessage ? 'flex justify-end' : ''}`}>
            <MessageReactions
              messageId={message.id}
              reactions={message.reactions || []}
              currentUserId={currentUserId || undefined}
            />
          </div>

          {/* Thread preview */}
          {message.reply_count > 0 && (
            <button
              onClick={handleOpenThread}
              className={`mt-1.5 text-xs font-semibold ${
                isOwnMessage ? 'text-purple-300 hover:text-white' : 'text-[#D9A441] hover:text-yellow-300'
              } transition-colors`}
            >
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
