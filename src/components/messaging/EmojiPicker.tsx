'use client'

import { useState } from 'react'
import { Smile } from 'lucide-react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  trigger?: React.ReactNode
}

// Common emoji reactions (like Slack)
const QUICK_REACTIONS = [
  { emoji: '👍', label: 'thumbs up' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '😂', label: 'laughing' },
  { emoji: '😮', label: 'surprised' },
  { emoji: '😢', label: 'sad' },
  { emoji: '🎉', label: 'party' },
  { emoji: '🚀', label: 'rocket' },
  { emoji: '👀', label: 'eyes' },
  { emoji: '🔥', label: 'fire' },
  { emoji: '✅', label: 'check' },
  { emoji: '👏', label: 'clap' },
  { emoji: '💯', label: '100' },
]

const EMOJI_CATEGORIES = {
  Smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙'],
  Gestures: ['👍', '👎', '👏', '🙌', '👐', '🤝', '🤲', '🙏', '✊', '👊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  Objects: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🥊'],
  Symbols: ['✅', '❌', '⭐', '🌟', '💫', '✨', '🔥', '💥', '💢', '💦', '💨', '🕳️', '💬', '💭', '🗯️', '💤', '👁️', '🗨️', '🗯️', '💭'],
}

export function EmojiPicker({ onEmojiSelect, trigger }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys')

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Add reaction"
      >
        {trigger || <Smile className="w-5 h-5 text-gray-600" />}
      </button>

      {/* Emoji Picker Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full right-0 mb-2 z-20 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
            {/* Quick Reactions */}
            <div className="p-3 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                {QUICK_REACTIONS.map((item) => (
                  <button
                    key={item.emoji}
                    onClick={() => handleEmojiClick(item.emoji)}
                    className="text-2xl hover:bg-gray-100 p-2 rounded transition-colors"
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-gray-200 px-3">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    activeCategory === category
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-2xl hover:bg-gray-100 p-2 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
