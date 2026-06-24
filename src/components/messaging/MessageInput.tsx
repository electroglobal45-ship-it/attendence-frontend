'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useSocket, useTypingIndicator } from '@/hooks/useSocket'
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

  const handleSend = async () => {
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

  const canSend = (content.trim() || selectedFiles.length > 0) && !isUploading

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
        <div className="flex items-center gap-1 px-2 pb-2">
          <EmojiPicker onEmojiSelect={(emoji) => {
            setContent(prev => prev + emoji)
            textareaRef.current?.focus()
          }} />
          <FileUpload onFilesSelected={setSelectedFiles} />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2 rounded-lg transition-all ${
              canSend
                ? 'bg-[#D9A441] hover:bg-[#C48B2F] text-[#1E0A2E]'
                : 'bg-[#4A1F6F]/30 text-purple-500 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Helper */}
      <p className="text-[10px] text-purple-500 mt-1.5 px-1">
        Press <kbd className="px-1 py-0.5 bg-[#2D1152] rounded border border-[#4A1F6F]/40 text-purple-300">Enter</kbd> to send,{' '}
        <kbd className="px-1 py-0.5 bg-[#2D1152] rounded border border-[#4A1F6F]/40 text-purple-300">Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}
