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
    <div className="relative inline-flex items-center justify-center">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-[#4A1F6F]/50 transition-colors flex items-center justify-center cursor-pointer"
        title="Add emoji"
      >
        {trigger || <Smile className="w-5 h-5" />}
      </button>

      {/* Emoji Picker Dropdown / Mobile Sheet */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed sm:absolute inset-x-3 bottom-20 sm:bottom-full sm:right-0 sm:inset-auto mb-2 z-50 w-auto sm:w-80 max-w-sm mx-auto bg-[#1E0A2E] text-white rounded-2xl shadow-2xl border border-[#4A1F6F]/60 flex flex-col overflow-hidden animate-fade-in font-sans">
            {/* Quick Reactions */}
            <div className="p-3 border-b border-[#4A1F6F]/40 bg-[#150825]/60">
              <div className="flex flex-wrap items-center justify-between gap-1">
                {QUICK_REACTIONS.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => handleEmojiClick(item.emoji)}
                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-[#2D1152] rounded-xl transition-colors cursor-pointer"
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-[#4A1F6F]/40 px-2 bg-[#1E0A2E] overflow-x-auto no-scrollbar">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
                  className={`px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex-1 text-center ${
                    activeCategory === category
                      ? 'text-[#D9A441] border-b-2 border-[#D9A441]'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 max-h-56 sm:max-h-64 overflow-y-auto bg-[#1E0A2E]">
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="w-10 h-10 flex items-center justify-center text-xl hover:bg-[#2D1152] rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95"
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
