'use client'

import { useState } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { MessageReaction } from '@/types/messaging.types'
import { Plus } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'

interface MessageReactionsProps {
  messageId: string
  reactions: MessageReaction[]
  currentUserId?: string
}

export function MessageReactions({ messageId, reactions, currentUserId }: MessageReactionsProps) {
  const { addReaction, removeReaction } = useSocket()

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction)
    return acc
  }, {} as Record<string, MessageReaction[]>)

  const handleReactionClick = (emoji: string, userReaction?: MessageReaction) => {
    if (userReaction) {
      // Remove reaction if user already reacted with this emoji
      removeReaction(messageId, userReaction.id)
    } else {
      // Add reaction
      addReaction(messageId, emoji)
    }
  }

  const handleAddReaction = (emoji: string) => {
    addReaction(messageId, emoji)
  }

  if (reactions.length === 0) {
    return null // Don't show anything if there are no reactions
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const userReaction = currentUserId
          ? reactionList.find((r) => r.user_id === currentUserId)
          : undefined
        const hasUserReacted = !!userReaction
        const count = reactionList.length

        return (
          <ReactionButton
            key={emoji}
            emoji={emoji}
            count={count}
            hasUserReacted={hasUserReacted}
            users={reactionList.map((r) => r.user?.name || 'Unknown').join(', ')}
            onClick={() => handleReactionClick(emoji, userReaction)}
          />
        )
      })}
    </div>
  )
}

interface ReactionButtonProps {
  emoji: string
  count: number
  hasUserReacted: boolean
  users: string
  onClick: () => void
}

function ReactionButton({ emoji, count, hasUserReacted, users, onClick }: ReactionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm
        transition-all
        ${
          hasUserReacted
            ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
            : 'bg-gray-100 border border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'
        }
      `}
      title={users}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className={`text-xs font-medium ${hasUserReacted ? 'text-indigo-700' : 'text-gray-700'}`}>
        {count}
      </span>
    </button>
  )
}
