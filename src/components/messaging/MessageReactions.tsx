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
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
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
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
        transition-all border
        ${
          hasUserReacted
            ? 'bg-[#D9A441]/20 border-[#D9A441]/60 text-[#D9A441]'
            : 'bg-[#2D1152] border-[#4A1F6F]/40 text-purple-300 hover:border-[#D9A441]/40 hover:text-[#D9A441]'
        }
      `}
      title={users}
    >
      <span className="text-sm leading-none">{emoji}</span>
      <span className="font-medium">{count}</span>
    </button>
  )
}
