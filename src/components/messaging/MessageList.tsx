'use client'

import { useEffect, useRef, useState } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { Loader2, Smile } from 'lucide-react'
import { MessageReactions } from './MessageReactions'
import { UserAvatarWithPresence } from './PresenceIndicator'
import { MessageAttachments } from './MessageAttachments'

interface MessageListProps {
  channelId?: string
  conversationId?: string
}

export default function MessageList({ channelId, conversationId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelMessages = useMessagingStore((state) => state.channelMessages)
  const conversationMessages = useMessagingStore((state) => state.conversationMessages)

  // Get messages based on active chat
  const messages = channelId
    ? channelMessages[channelId] || []
    : conversationId
    ? conversationMessages[conversationId] || []
    : []

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Be the first to send a message!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

function MessageItem({ message }: { message: any }) {
  const setActiveThread = useMessagingStore((state) => state.setActiveThread)
  const setThreadPanelOpen = useMessagingStore((state) => state.setThreadPanelOpen)
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  const handleOpenThread = () => {
    setActiveThread(message.id)
    setThreadPanelOpen(true)
  }

  const handleAddReaction = (emoji: string) => {
    // TODO: Add reaction via socket
    console.log('Add reaction:', emoji, 'to message:', message.id)
    setShowReactionPicker(false)
  }

  if (message.is_deleted) {
    return (
      <div className="py-2 px-4 text-sm text-gray-400 italic">
        This message was deleted
      </div>
    )
  }

  // Get current user ID from auth
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
  const messageSenderId = String(message.sender_id)
  const isOwnMessage = currentUserId && currentUserId === messageSenderId

  // Debug log
  console.log('Message check:', {
    currentUserId,
    messageSenderId,
    isOwnMessage,
    senderName: message.sender?.name
  })

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} px-4 py-1`}>
      <div className={`flex gap-3 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar with Presence - Hide for own messages */}
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
          {/* Reaction Button - Shows on Hover */}
          <div className={`absolute -top-2 ${isOwnMessage ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
            <div className="relative">
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded-full hover:border-blue-500 hover:bg-blue-50 text-xs shadow-sm transition-all"
                title="Add reaction"
              >
                <Smile className="w-3 h-3 text-gray-600" />
              </button>
              
              {/* Quick Emoji Picker */}
              {showReactionPicker && (
                <div className={`absolute top-full ${isOwnMessage ? 'left-0' : 'right-0'} mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20`}>
                  <div className="flex gap-1">
                    {['👍', '❤️', '😄', '🎉', '👏', '🔥', '✅', '👀'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(emoji)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-lg"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-4 py-2 ${
              isOwnMessage
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {/* Sender Name - Only for other's messages */}
            {!isOwnMessage && (
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-900">
                  {message.sender?.name || 'Unknown User'}
                </span>
              </div>
            )}

            {/* Message Content */}
            <div className={`break-words whitespace-pre-wrap ${isOwnMessage ? 'text-white' : 'text-gray-800'}`}>
              {message.content}
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments attachments={message.attachments} />
            )}

            {/* Timestamp & Edit */}
            <div className={`flex items-center gap-2 mt-1 text-xs ${isOwnMessage ? 'text-blue-100 justify-end' : 'text-gray-500'}`}>
              <span>
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {message.edited_at && (
                <span className={isOwnMessage ? 'text-blue-200' : 'text-gray-400'}>(edited)</span>
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

          {/* Thread Preview */}
          {message.reply_count > 0 && (
            <button
              onClick={handleOpenThread}
              className={`mt-2 text-sm font-medium ${
                isOwnMessage ? 'text-blue-600 hover:text-blue-700' : 'text-indigo-600 hover:text-indigo-700'
              }`}
            >
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
