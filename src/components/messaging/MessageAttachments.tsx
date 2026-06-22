'use client'

import { MessageAttachment } from '@/types/messaging.types'
import { Download, File, FileText, Image as ImageIcon, Video, Music, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <AttachmentItem key={attachment.id} attachment={attachment} />
      ))}
    </div>
  )
}

function AttachmentItem({ attachment }: { attachment: MessageAttachment }) {
  const [imageError, setImageError] = useState(false)
  const [isImageExpanded, setIsImageExpanded] = useState(false)

  const isImage = attachment.file_type.startsWith('image/')
  const isVideo = attachment.file_type.startsWith('video/')
  const isAudio = attachment.file_type.startsWith('audio/')
  const isPDF = attachment.file_type === 'application/pdf'
  const isDocument = attachment.file_type.includes('document') || attachment.file_type.includes('msword')

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="w-5 h-5" />
    if (isVideo) return <Video className="w-5 h-5" />
    if (isAudio) return <Music className="w-5 h-5" />
    if (isPDF || isDocument) return <FileText className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(attachment.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Image attachment with preview
  if (isImage && !imageError) {
    return (
      <div className="max-w-md">
        <div
          className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200"
          onClick={() => setIsImageExpanded(true)}
        >
          <img
            src={attachment.file_url}
            alt={attachment.file_name}
            className="w-full h-auto max-h-96 object-contain bg-gray-50"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
            <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-xs text-gray-500 truncate">{attachment.file_name}</span>
          <button
            onClick={handleDownload}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Image Modal */}
        {isImageExpanded && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
            onClick={() => setIsImageExpanded(false)}
          >
            <div className="relative max-w-7xl max-h-full">
              <img
                src={attachment.file_url}
                alt={attachment.file_name}
                className="max-w-full max-h-[90vh] object-contain"
              />
              <button
                onClick={() => setIsImageExpanded(false)}
                className="absolute top-4 right-4 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Video attachment with player
  if (isVideo) {
    return (
      <div className="max-w-md">
        <video
          src={attachment.file_url}
          controls
          className="w-full rounded-lg border border-gray-200 bg-gray-50"
        >
          Your browser does not support the video tag.
        </video>
        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-xs text-gray-500 truncate">{attachment.file_name}</span>
          <span className="text-xs text-gray-400">{formatFileSize(attachment.file_size)}</span>
        </div>
      </div>
    )
  }

  // Audio attachment with player
  if (isAudio) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 max-w-md">
        <div className="flex-shrink-0 text-gray-600">
          <Music className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
          <audio src={attachment.file_url} controls className="w-full mt-2">
            Your browser does not support the audio tag.
          </audio>
        </div>
        <button
          onClick={handleDownload}
          className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition-colors"
          title="Download"
        >
          <Download className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    )
  }

  // PDF preview (iframe)
  if (isPDF) {
    return (
      <div className="max-w-2xl">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <iframe
            src={attachment.file_url}
            className="w-full h-96"
            title={attachment.file_name}
          />
        </div>
        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-xs text-gray-500 truncate">{attachment.file_name}</span>
          <button
            onClick={handleDownload}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    )
  }

  // Generic file attachment
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 max-w-md hover:bg-gray-100 transition-colors">
      <div className="flex-shrink-0 text-gray-600">
        {getFileIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
      </div>
      <button
        onClick={handleDownload}
        className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition-colors"
        title="Download"
      >
        <Download className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  )
}
