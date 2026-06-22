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
    
    // TODO: Upload files to storage (Supabase) and get URLs
    // For now, we'll just send the message without attachments
    if (selectedFiles.length > 0) {
      setIsUploading(true)
      try {
        // Upload files logic here
        // const attachments = await uploadFiles(selectedFiles)
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

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    handleTyping()

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
  }

  const handleAddEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-end gap-2 bg-white border-2 border-gray-200 rounded-lg focus-within:border-indigo-500 transition-colors">
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isUploading}
          className="flex-1 px-4 py-3 resize-none outline-none max-h-[150px]"
          style={{ minHeight: '44px' }}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 px-2 pb-2">
          <EmojiPicker onEmojiSelect={handleAddEmoji} />

          <FileUpload onFilesSelected={handleFilesSelected} />

          <button
            onClick={handleSend}
            disabled={(!content.trim() && selectedFiles.length === 0) || isUploading}
            className={`
              p-2 rounded-lg transition-colors
              ${
                (content.trim() || selectedFiles.length > 0) && !isUploading
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-2 px-2">
        Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}
