'use client'

import { useMessagingStore } from '@/store/messaging.store'

interface TypingIndicatorProps {
  channelId?: string
  conversationId?: string
}

export default function TypingIndicator({ channelId, conversationId }: TypingIndicatorProps) {
  const typingUsers = useMessagingStore((state) => state.typingUsers)

  // Filter typing users for current channel/conversation
  const activeTypingUsers = typingUsers.filter(
    (user) =>
      (channelId && user.channel_id === channelId) ||
      (conversationId && user.conversation_id === conversationId)
  )

  if (activeTypingUsers.length === 0) {
    return null
  }

  // Format typing text
  const getTypingText = () => {
    const names = activeTypingUsers.map((u) => u.user_name)
    
    if (names.length === 1) {
      return `${names[0]} is typing...`
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`
    } else if (names.length === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`
    } else {
      return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`
    }
  }

  return (
    <div className="px-6 py-2 text-sm text-gray-600 flex items-center gap-2">
      <span>{getTypingText()}</span>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
