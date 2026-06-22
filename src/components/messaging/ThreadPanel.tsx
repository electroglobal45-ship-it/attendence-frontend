'use client'

import { useEffect } from 'react'
import { useMessagingStore } from '@/store/messaging.store'
import { X, Hash, MessageSquare } from 'lucide-react'
import MessageInput from './MessageInput'

export default function ThreadPanel() {
  const activeThreadId = useMessagingStore((state) => state.activeThreadId)
  const threadMessages = useMessagingStore((state) => state.threadMessages)
  const channelMessages = useMessagingStore((state) => state.channelMessages)
  const conversationMessages = useMessagingStore((state) => state.conversationMessages)
  const setThreadPanelOpen = useMessagingStore((state) => state.setThreadPanelOpen)
  const setActiveThread = useMessagingStore((state) => state.setActiveThread)

  // Find the parent message
  const parentMessage = Object.values(channelMessages)
    .flat()
    .concat(Object.values(conversationMessages).flat())
    .find((msg) => msg.id === activeThreadId)

  const replies = activeThreadId ? threadMessages[activeThreadId] || [] : []

  const handleClose = () => {
    setThreadPanelOpen(false)
    setActiveThread(null)
  }

  if (!activeThreadId || !parentMessage) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Thread Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Thread</h2>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Parent Message */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-semibold">
                {parentMessage.sender?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-gray-900">
                  {parentMessage.sender?.name || 'Unknown User'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(parentMessage.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-gray-800 mt-1 break-words whitespace-pre-wrap">
                {parentMessage.content}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </div>
            </div>
          </div>
        </div>

        {/* Thread Replies */}
        {replies.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No replies yet</p>
            <p className="text-sm mt-1">Be the first to reply!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => (
              <ThreadReplyItem key={reply.id} message={reply} />
            ))}
          </div>
        )}
      </div>

      {/* Thread Reply Input */}
      <div className="border-t border-gray-200">
        <MessageInput
          channelId={parentMessage.channel_id}
          conversationId={parentMessage.conversation_id}
          parentMessageId={activeThreadId}
          placeholder="Reply to thread..."
        />
      </div>
    </div>
  )
}

function ThreadReplyItem({ message }: { message: any }) {
  if (message.is_deleted) {
    return (
      <div className="py-2 px-4 text-sm text-gray-400 italic">
        This message was deleted
      </div>
    )
  }

  return (
    <div className="flex gap-3 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
          {message.sender?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-gray-900">
            {message.sender?.name || 'Unknown User'}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.edited_at && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>

        <div className="text-sm text-gray-800 mt-1 break-words whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction: any) => (
              <button
                key={reaction.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs"
              >
                <span>{reaction.emoji}</span>
                <span className="text-gray-600">1</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
