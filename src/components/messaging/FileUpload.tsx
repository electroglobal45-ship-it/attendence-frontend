'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Paperclip, X, File, Image as ImageIcon, FileText, Video, Music } from 'lucide-react'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  maxFileSize?: number // in MB
  acceptedFileTypes?: string[]
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 10,
  maxFileSize = 10,
  acceptedFileTypes = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/*', 'video/*', 'audio/*'],
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      addFiles(filesArray)
    }
  }

  const addFiles = (newFiles: File[]) => {
    // Filter out files that are too large
    const validFiles = newFiles.filter((file) => {
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > maxFileSize) {
        alert(`${file.name} is too large. Max size is ${maxFileSize}MB`)
        return false
      }
      return true
    })

    // Limit number of files
    const filesToAdd = validFiles.slice(0, maxFiles - selectedFiles.length)
    const updatedFiles = [...selectedFiles, ...filesToAdd]
    
    setSelectedFiles(updatedFiles)
    onFilesSelected(updatedFiles)
  }

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(updatedFiles)
    onFilesSelected(updatedFiles)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files)
      addFiles(filesArray)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />
    if (file.type.startsWith('video/')) return <Video className="w-5 h-5" />
    if (file.type.startsWith('audio/')) return <Music className="w-5 h-5" />
    if (file.type === 'application/pdf' || file.type.includes('document')) return <FileText className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div>
      {/* File Input (Hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Attach file"
      >
        <Paperclip className="w-5 h-5 text-gray-600" />
      </button>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-3 space-y-2">
          {selectedFiles.map((file, index) => (
            <FilePreview
              key={`${file.name}-${index}`}
              file={file}
              icon={getFileIcon(file)}
              size={formatFileSize(file.size)}
              onRemove={() => removeFile(index)}
            />
          ))}
        </div>
      )}

      {/* Drag and Drop Zone (Optional) */}
      {dragActive && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="fixed inset-0 z-50 bg-indigo-500 bg-opacity-90 flex items-center justify-center"
        >
          <div className="text-white text-center">
            <Paperclip className="w-16 h-16 mx-auto mb-4" />
            <p className="text-2xl font-semibold">Drop files to upload</p>
            <p className="text-lg mt-2">Max {maxFiles} files, {maxFileSize}MB each</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface FilePreviewProps {
  file: File
  icon: React.ReactNode
  size: string
  onRemove: () => void
}

function FilePreview({ file, icon, size, onRemove }: FilePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)

  // Generate preview for images
  if (file.type.startsWith('image/') && !preview) {
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Preview or Icon */}
      {preview ? (
        <img src={preview} alt={file.name} className="w-12 h-12 object-cover rounded" />
      ) : (
        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-600">
          {icon}
        </div>
      )}

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-500">{size}</p>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="Remove file"
      >
        <X className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  )
}
