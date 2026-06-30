'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useSocket, useTypingIndicator } from '@/hooks/useSocket'
import { useMessagingStore } from '@/store/messaging.store'
import { Send } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import { FileUpload } from './FileUpload'

interface MessageInputProps {
  channelId?: string
  conversationId?: string
  parentMessageId?: string
  placeholder?: string
}

export default function MessageInput({
  channelId,
  conversationId,
  parentMessageId,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { sendMessage } = useSocket()
  const { handleTyping, handleStopTyping } = useTypingIndicator(channelId, conversationId)

  const channels = useMessagingStore((state) => state.channels)
  const activeChannel = channels.find((c) => c.id === channelId)

  // Check if channel is restricted to admins & sub-admins (WhatsApp channel style)
  const isOnlyAdminsCanMessage = channelId
    ? (typeof window !== 'undefined' && localStorage.getItem(`channel_only_admins_${channelId}`) === 'true') || (activeChannel as any)?.only_admins_can_message === true
    : false

  const getLoggedUserRole = () => {
    if (typeof window === 'undefined') return ''
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed?.role) return String(parsed.role).toLowerCase()
      } catch (e) {}
    }
    return (localStorage.getItem('userRole') || '').toLowerCase()
  }

  const role = getLoggedUserRole()
  const isUserAdminOrSubAdmin = role === 'admin' || role === 'sub-admin' || role === 'sub_admin' || role === 'hr'

  const isMessagingRestricted = isOnlyAdminsCanMessage && !isUserAdminOrSubAdmin

  const handleSend = async () => {
    if (isMessagingRestricted) return
    if (!content.trim() && selectedFiles.length === 0) return

    const tempId = `temp-${Date.now()}`

    if (selectedFiles.length > 0) {
      setIsUploading(true)
      try {
        console.log('Files to upload:', selectedFiles)
      } catch (error) {
        console.error('File upload error:', error)
      } finally {
        setIsUploading(false)
      }
    }

    sendMessage({
      content: content.trim() || '📎 File attachment',
      channelId,
      conversationId,
      parentMessageId,
      tempId,
    })

    setContent('')
    setSelectedFiles([])
    handleStopTyping()

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    handleTyping()
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
  }

  const canSend = (content.trim() || selectedFiles.length > 0) && !isUploading && !isMessagingRestricted

  if (isMessagingRestricted) {
    return (
      <div className="px-4 py-4 bg-[#1E0A2E] text-center border-t border-[#4A1F6F]/40 flex items-center justify-center gap-2.5 text-purple-200 text-xs sm:text-sm font-medium animate-fade-in">
        <span className="text-base">🔒</span>
        <span>Only admins and sub-admins can send messages in this channel.</span>
      </div>
    )
  }

  return (
    <div className="px-4 py-3">
      <div className={`flex items-end gap-2 bg-[#2D1152] border rounded-xl transition-colors ${
        canSend ? 'border-[#D9A441]/40' : 'border-[#4A1F6F]/40'
      } focus-within:border-[#D9A441]/60`}>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isUploading}
          className="flex-1 px-4 py-3 resize-none outline-none max-h-[150px] bg-transparent text-white placeholder-purple-400 text-sm"
          style={{ minHeight: '44px' }}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 pb-2 self-end mb-0.5">
          <EmojiPicker onEmojiSelect={(emoji) => {
            setContent(prev => prev + emoji)
            textareaRef.current?.focus()
          }} />
          <FileUpload onFilesSelected={setSelectedFiles} />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 ${
              canSend
                ? 'bg-[#D9A441] hover:bg-[#C48B2F] text-[#1E0A2E] shadow-md hover:scale-105 active:scale-95'
                : 'bg-[#4A1F6F]/30 text-purple-500 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
