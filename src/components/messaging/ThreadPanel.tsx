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
    <div className="flex flex-col h-full bg-[#1E0A2E] text-white">
      {/* Thread Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#4A1F6F]/40 bg-[#1E0A2E] flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#D9A441]" />
          <h2 className="text-base font-bold text-white font-jakarta">Thread</h2>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-[#2D1152] rounded-lg transition-colors text-purple-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Parent Message */}
        <div className="border-b border-[#4A1F6F]/40 pb-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-[#4A1F6F] border border-[#4A1F6F]/30 flex items-center justify-center text-white font-semibold">
                {parentMessage.sender?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm text-[#D9A441]">
                  {parentMessage.sender?.name || 'Unknown User'}
                </span>
                <span className="text-[10px] text-purple-400">
                  {new Date(parentMessage.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-purple-100 text-sm mt-1 break-words whitespace-pre-wrap">
                {parentMessage.content}
              </div>
              <div className="text-xs text-purple-400 mt-2">
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </div>
            </div>
          </div>
        </div>

        {/* Thread Replies */}
        {replies.length === 0 ? (
          <div className="text-center text-purple-400 py-8">
            <p className="text-sm font-medium">No replies yet</p>
            <p className="text-xs text-purple-500 mt-0.5">Be the first to reply!</p>
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
      <div className="border-t border-[#4A1F6F]/40 bg-[#1E0A2E]">
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
      <div className="py-2 px-4 text-xs text-purple-500 italic">
        This message was deleted
      </div>
    )
  }

  return (
    <div className="flex gap-3 hover:bg-[#2D1152]/30 px-3 py-2.5 rounded-lg transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#4A1F6F] border border-[#4A1F6F]/30 flex items-center justify-center text-white text-xs font-semibold">
          {message.sender?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-xs text-[#D9A441]">
            {message.sender?.name || 'Unknown User'}
          </span>
          <span className="text-[10px] text-purple-400">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.edited_at && (
            <span className="text-[10px] text-purple-400">(edited)</span>
          )}
        </div>

        <div className="text-xs text-purple-100 mt-1 break-words whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction: any) => (
              <button
                key={reaction.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2D1152] border border-[#4A1F6F]/30 hover:bg-[#4A1F6F]/40 text-purple-300 transition-colors text-[10px]"
              >
                <span>{reaction.emoji}</span>
                <span>1</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
