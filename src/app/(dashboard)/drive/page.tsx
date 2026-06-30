'use client'

import { useEffect, useState, useRef } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { driveAPI, DriveFile, ShareData } from '@/lib/drive-api'
import { 
  FolderPlus, Upload, Share2, X, Download, 
  Trash2, ExternalLink, LogOut, MoreVertical, ChevronDown
} from 'lucide-react'
import { usePrefetchStore } from '@/lib/store/prefetch-store'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

type Tab = 'my-drive' | 'shared-by-me' | 'shared-with-me' | 'meeting-recordings'

export default function DrivePage() {
  const { driveFiles: storeDriveFiles, driveConnected, driveEmail } = usePrefetchStore()
  const [tab, setTab] = useState<Tab>('my-drive')
  const [connected, setConnected] = useState(() => driveConnected ?? false)
  const [connectionEmail, setConnectionEmail] = useState<string | null>(() => driveEmail ?? null)
  const [loading, setLoading] = useState(() => driveConnected === null)
  const [files, setFiles] = useState<DriveFile[]>(() => storeDriveFiles ?? [])
  const [sharedByMe, setSharedByMe] = useState<ShareData[]>([])
  const [sharedWithMe, setSharedWithMe] = useState<ShareData[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showShare, setShowShare] = useState<DriveFile | null>(null)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isFetching, setIsFetching] = useState(() => !(storeDriveFiles && storeDriveFiles.length > 0))
  const [unreadCount, setUnreadCount] = useState(0)
  const [users, setUsers] = useState<any[]>([])
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null)
  const [togglingKeys, setTogglingKeys] = useState<Record<string, boolean>>({})

  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false)
  const actionsDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkConnection()
    // Fetch users list for sharing dropdown panel
    const token = localStorage.getItem('authToken')
    fetch(`${BACKEND_URL}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(d => {
      if (d.success && d.data?.users) {
        setUsers(d.data.users)
      } else if (d.success && Array.isArray(d.data)) {
        setUsers(d.data)
      }
    })
    .catch(() => {})
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setIsActionsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync files with store if updated externally
  useEffect(() => {
    if (storeDriveFiles && storeDriveFiles.length > 0) {
      setFiles(storeDriveFiles)
    }
  }, [storeDriveFiles])

  // Sync connection status with store if updated externally
  useEffect(() => {
    if (driveConnected !== null) {
      setConnected(driveConnected)
      setLoading(false)
    }
    if (driveEmail !== null) {
      setConnectionEmail(driveEmail)
    }
  }, [driveConnected, driveEmail])

  useEffect(() => {
    if (connected) {
      if (tab === 'my-drive') {
        const hasData = storeDriveFiles && storeDriveFiles.length > 0
        loadFiles(hasData)
      }
      else if (tab === 'shared-by-me') loadSharedByMe()
      else if (tab === 'shared-with-me') loadSharedWithMe()
      else loadMeetingRecordings()
      
      // Fetch unread count independently of tab
      driveAPI.getSharedWithMe()
        .then(data => setUnreadCount(data.filter(s => !s.viewed).length))
        .catch(() => {})
    }
  }, [connected, tab])

  useEffect(() => {
    const handleUpdate = () => {
      if (connected) {
        driveAPI.getSharedWithMe()
          .then(data => setUnreadCount(data.filter(s => !s.viewed).length))
          .catch(() => {})
      }
    }
    window.addEventListener('drive-shares-updated', handleUpdate)
    return () => window.removeEventListener('drive-shares-updated', handleUpdate)
  }, [connected])

  const checkConnection = async () => {
    try {
      const status = await driveAPI.getConnectionStatus()
      setConnected(status.connected)
      setConnectionEmail(status.email)
    } catch (err: any) {
      // Check if it's a token refresh error
      if (err.message?.includes('refresh access token') || err.message?.includes('invalid_grant')) {
        setConnected(false)
        setConnectionEmail(null)
        alert('Your Google Drive connection has expired. Please reconnect.')
      } else {
        setConnected(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const authUrl = await driveAPI.getAuthUrl()
      window.location.href = authUrl
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await driveAPI.disconnect()
      setConnected(false)
      setConnectionEmail(null)
      setShowDisconnectConfirm(false)
      usePrefetchStore.setState({ driveConnected: false, driveEmail: null, driveFiles: [] })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDisconnecting(false)
    }
  }

  const loadFiles = async (silent = false) => {
    if (!silent) setIsFetching(true)
    try {
      const data = await driveAPI.listFiles()
      setFiles(data)
      usePrefetchStore.setState({ driveFiles: data, status: { ...usePrefetchStore.getState().status, drive: 'done' } })
    } catch (err: any) {
      if (!silent) alert(err.message)
    } finally {
      if (!silent) setIsFetching(false)
    }
  }

  const loadSharedByMe = async (silent = false) => {
    if (!silent) setIsFetching(true)
    try {
      const data = await driveAPI.getSharedByMe()
      setSharedByMe(data)
    } catch (err: any) {
      if (!silent) alert(err.message)
    } finally {
      if (!silent) setIsFetching(false)
    }
  }

  const loadSharedWithMe = async () => {
    setIsFetching(true)
    try {
      const data = await driveAPI.getSharedWithMe()
      setSharedWithMe(data)
      setUnreadCount(data.filter((s: any) => !s.viewed).length)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsFetching(false)
    }
  }

  const loadMeetingRecordings = async () => {
    setIsFetching(true)
    try {
      const searchResults = await driveAPI.searchFiles('Meeting Recordings')
      const folder = searchResults.find(f => f.name === 'Meeting Recordings' && f.mimeType === 'application/vnd.google-apps.folder')
      
      if (folder) {
        const data = await driveAPI.listFiles(folder.id)
        setFiles(data)
      } else {
        setFiles([])
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsFetching(false)
    }
  }

  const handleOpenShare = async (share: any) => {
    if (!share.viewed) {
      try {
        await driveAPI.markAsViewed(share.id)
        setSharedWithMe(prev => prev.map(s => s.id === share.id ? { ...s, viewed: true } : s))
        setUnreadCount(prev => Math.max(0, prev - 1))
        window.dispatchEvent(new CustomEvent('drive-shares-updated'))
      } catch (err) {
        console.error('Failed to mark as viewed', err)
      }
    }
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get('file') as File
    if (!file) return

    const optimisticId = `temp-${Date.now()}`
    const optimisticFile: DriveFile = {
      id: optimisticId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size.toString(),
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      webViewLink: ''
    }

    const updatedFiles = [optimisticFile, ...files]
    setFiles(updatedFiles)
    usePrefetchStore.setState({ driveFiles: updatedFiles })

    setShowUpload(false)

    driveAPI.uploadFile(file).then(() => {
      loadFiles(true)
    }).catch((err: any) => {
      alert(`Upload failed: ${err.message}`)
      setFiles(prev => {
        const reverted = prev.filter(f => f.id !== optimisticId)
        usePrefetchStore.setState({ driveFiles: reverted })
        return reverted
      })
    })
  }

  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const folderName = formData.get('folderName') as string
    if (!folderName) return

    const optimisticId = `temp-${Date.now()}`
    const optimisticFolder: DriveFile = {
      id: optimisticId,
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      size: '',
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      webViewLink: ''
    }

    const updatedFiles = [optimisticFolder, ...files]
    setFiles(updatedFiles)
    usePrefetchStore.setState({ driveFiles: updatedFiles })

    setShowNewFolder(false)

    driveAPI.createFolder(folderName).then(() => {
      loadFiles(true)
    }).catch((err: any) => {
      alert(`Failed to create folder: ${err.message}`)
      setFiles(prev => {
        const reverted = prev.filter(f => f.id !== optimisticId)
        usePrefetchStore.setState({ driveFiles: reverted })
        return reverted
      })
    })
  }

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return
    try {
      setFiles(prev => prev.filter(f => f.id !== fileId))
      usePrefetchStore.setState({
        driveFiles: usePrefetchStore.getState().driveFiles.filter(f => f.id !== fileId)
      })
      await driveAPI.deleteFile(fileId)
      loadFiles(true)
    } catch (err: any) {
      alert(err.message)
      loadFiles(true)
    }
  }

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      await driveAPI.downloadFile(fileId, fileName)
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <PageWrapper title="Drive" subtitle="Connecting...">
        <div className="card p-0 opacity-50 animate-pulse">
          <div className="h-64 bg-gray-50 rounded-lg"></div>
        </div>
      </PageWrapper>
    )
  }

  if (!connected) {
    return (
      <PageWrapper title="Drive" subtitle="Connect your Google Drive">
        <div className="max-w-2xl mx-auto">
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 3.5L1.15 15l3.42 6h13.42l3.42-6-6.56-11.5z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Google Drive</h2>
            <p className="text-gray-600 mb-6">
              Access, share, and collaborate on files with your team
            </p>
            <button onClick={handleConnect} className="btn-primary inline-flex items-center gap-2">
              <ExternalLink size={16} />
              Connect with Google
            </button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title="Drive"
      subtitle={connectionEmail || 'Connected'}
      actions={
        <div className="relative" ref={actionsDropdownRef}>
          <button
            onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
            className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
              isActionsDropdownOpen
                ? 'bg-[#4A1F6F] text-white border-[#4A1F6F]'
                : 'text-purple-700 border-purple-200 bg-purple-50/50 hover:bg-purple-100/60'
            }`}
            title="More Options"
          >
            <MoreVertical size={20} />
          </button>
          
          {isActionsDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-150 rounded-xl shadow-xl py-1.5 z-[100] animate-fade-in text-sm font-semibold text-gray-700">
              {tab === 'my-drive' && (
                <>
                  <button
                    onClick={() => {
                      setShowNewFolder(true)
                      setIsActionsDropdownOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-purple-50 hover:text-[#4A1F6F] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FolderPlus size={16} />
                    <span>New Folder</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUpload(true)
                      setIsActionsDropdownOpen(false)
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-purple-50 hover:text-[#4A1F6F] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Upload size={16} />
                    <span>Upload File</span>
                  </button>
                  <div className="my-1.5 border-t border-gray-100" />
                </>
              )}
              <button
                onClick={() => {
                  setShowDisconnectConfirm(true)
                  setIsActionsDropdownOpen(false)
                }}
                className="w-full px-4 py-2.5 text-left text-red-650 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap no-scrollbar max-w-full">
        <button
          onClick={() => setTab('my-drive')}
          className={`px-3 py-2 lg:px-4 font-medium transition shrink-0 whitespace-nowrap text-sm ${
            tab === 'my-drive'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="lg:hidden">Mine</span>
          <span className="hidden lg:inline">My Drive</span>
        </button>
        <button
          onClick={() => setTab('shared-by-me')}
          className={`px-3 py-2 lg:px-4 font-medium transition shrink-0 whitespace-nowrap text-sm ${
            tab === 'shared-by-me'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="lg:hidden">By Me</span>
          <span className="hidden lg:inline">Shared by me</span>
        </button>
        <button
          onClick={() => setTab('shared-with-me')}
          className={`px-3 py-2 lg:px-4 font-medium transition flex items-center gap-1.5 shrink-0 whitespace-nowrap text-sm ${
            tab === 'shared-with-me'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="lg:hidden">With Me</span>
          <span className="hidden lg:inline">Shared with me</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('meeting-recordings')}
          className={`px-3 py-2 lg:px-4 font-medium transition shrink-0 whitespace-nowrap text-sm ${
            tab === 'meeting-recordings'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="lg:hidden">Recordings</span>
          <span className="hidden lg:inline">Meeting Recordings</span>
        </button>
      </div>

      {/* My Drive Tab */}
      {tab === 'my-drive' && (
        <div className="card p-0">
          {isFetching ? (
            <div className="text-center py-20 text-gray-400 animate-pulse">
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              No files yet. Upload your first file!
            </div>
          ) : (
            <div className="table-wrapper border-0 overflow-x-auto w-full no-scrollbar">
              <table className="table min-w-[650px]">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Modified</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => {
                    const isOptimistic = file.id.startsWith('temp-')
                    return (
                      <tr key={file.id} style={isOptimistic ? { opacity: 0.5 } : undefined}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{driveAPI.getFileIcon(file.mimeType)}</span>
                            <span className="font-medium flex items-center gap-2">
                              {file.name}
                              {isOptimistic && (
                                <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold animate-pulse whitespace-nowrap">
                                  {file.mimeType.includes('folder') ? 'Creating...' : 'Uploading...'}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">{new Date(file.modifiedTime).toLocaleDateString()}</td>
                        <td className="whitespace-nowrap">{driveAPI.formatFileSize(file.size)}</td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {!isOptimistic && file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-gray-100 rounded transition"
                                title="Open in Google Drive"
                              >
                                <ExternalLink size={16} />
                              </a>
                            )}
                            {!isOptimistic && !file.mimeType.includes('folder') && (
                              <button
                                onClick={() => handleDownload(file.id, file.name)}
                                className="p-1.5 hover:bg-gray-100 rounded transition"
                                title="Download"
                              >
                                <Download size={16} />
                              </button>
                            )}
                            {!isOptimistic && (
                              <button
                                onClick={() => setShowShare(file)}
                                className="p-1.5 hover:bg-gray-100 rounded transition"
                                title="Share"
                              >
                                <Share2 size={16} />
                              </button>
                            )}
                            {!isOptimistic && (
                              <button
                                onClick={() => handleDelete(file.id, file.name)}
                                className="p-1.5 hover:bg-red-100 text-red-600 rounded transition"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Meeting Recordings Tab */}
      {tab === 'meeting-recordings' && (
        <div className="card p-0">
          {isFetching ? (
            <div className="text-center py-20 text-gray-400 animate-pulse">
              Loading recordings...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              No recordings found. Use the Record button during meetings to save to Drive.
            </div>
          ) : (
            <div className="table-wrapper border-0 overflow-x-auto w-full no-scrollbar">
              <table className="table min-w-[650px]">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Modified</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🎥</span>
                          <span className="font-medium">{file.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{new Date(file.modifiedTime).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap">{driveAPI.formatFileSize(file.size)}</td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-gray-100 rounded transition"
                              title="Open in Google Drive"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => handleDownload(file.id, file.name)}
                            className="p-1.5 hover:bg-gray-100 rounded transition"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => setShowShare(file)}
                            className="p-1.5 hover:bg-gray-100 rounded transition"
                            title="Share"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(file.id, file.name)}
                            className="p-1.5 hover:bg-red-100 text-red-600 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Shared By Me Tab */}
      {tab === 'shared-by-me' && (
        <div className="space-y-4">
          {isFetching ? (
            <div className="card text-center py-20 text-gray-400 animate-pulse">
              Loading files...
            </div>
          ) : sharedByMe.length === 0 ? (
            <div className="card text-center py-20 text-gray-400">
              No files shared yet
            </div>
          ) : (() => {
            // Group shares by unique file_id
            const groupedShares: Record<string, { file_id: string; file_name: string; file_url: string; shares: typeof sharedByMe }> = {}
            sharedByMe.forEach(share => {
              if (!groupedShares[share.file_id]) {
                groupedShares[share.file_id] = {
                  file_id: share.file_id,
                  file_name: share.file_name,
                  file_url: share.file_url,
                  shares: []
                }
              }
              groupedShares[share.file_id].shares.push(share)
            })
            const groupedShareList = Object.values(groupedShares)

            return (
              <div className="space-y-3.5">
                {groupedShareList.map((item) => {
                  const isExpanded = expandedFileId === item.file_id
                  const sharedWithNames = item.shares.map(s => s.shared_with_user?.name || 'Unknown').join(', ')

                  return (
                    <div
                      key={item.file_id}
                      className="card p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs transition-all hover:border-purple-250/80"
                    >
                      {/* Main stacked row clickable */}
                      <div
                        onClick={() => setExpandedFileId(isExpanded ? null : item.file_id)}
                        className="flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-gray-800 text-sm group-hover:text-[#4A1F6F] transition-colors truncate">
                            {item.file_name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            <span className="font-semibold text-purple-700">Shared with:</span> {sharedWithNames}
                          </p>
                        </div>
                        <span className={`text-purple-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={18} />
                        </span>
                      </div>

                      {/* Dropdown panel */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in text-xs sm:text-sm text-gray-700">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">Google Drive Link</span>
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#4A1F6F] hover:underline inline-flex items-center gap-1 font-semibold"
                              >
                                Open File <ExternalLink size={14} />
                              </a>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">Status Details</span>
                              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                                {item.shares.map(s => (
                                  <div key={s.id} className="text-xs flex items-center justify-between gap-2">
                                    <span className="truncate font-medium">{s.shared_with_user?.name}:</span>
                                    <span className={`shrink-0 ${s.viewed ? 'text-emerald-600 font-semibold' : 'text-amber-600'}`}>
                                      {s.viewed ? 'Viewed' : 'Not viewed'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Manage Access Checklist */}
                          <div className="pt-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-2.5">
                                Manage Teammates Access (Check to Allow, Uncheck to Deny)
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                              {users.map(user => {
                                const currentShare = item.shares.find(s => s.shared_with === user.id)
                                const isChecked = !!currentShare
                                const toggleKey = `${user.id}-${item.file_id}`
                                const isToggling = !!togglingKeys[toggleKey]

                                return (
                                  <label
                                    key={user.id}
                                    className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${
                                      isChecked
                                        ? 'bg-purple-50/50 border-[#4A1F6F]/40 shadow-xs'
                                        : 'bg-white border-gray-200/70 hover:bg-gray-50/50'
                                    } ${isToggling ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isToggling}
                                      onChange={async (e) => {
                                        const shouldAllow = e.target.checked
                                        if (isToggling) return
                                        setTogglingKeys(prev => ({ ...prev, [toggleKey]: true }))
                                        
                                        // ── OPTIMISTIC STATE UPDATE ──
                                        if (shouldAllow) {
                                          const tempShareId = `temp-${Date.now()}`
                                          const tempShare: ShareData = {
                                            id: tempShareId,
                                            file_id: item.file_id,
                                            file_name: item.file_name,
                                            file_type: 'file',
                                            file_url: item.file_url,
                                            shared_by: connectionEmail || '',
                                            shared_with: user.id,
                                            permission: 'reader',
                                            shared_at: new Date().toISOString(),
                                            viewed: false,
                                            shared_with_user: user
                                          }
                                          setSharedByMe(prev => [...prev, tempShare])

                                          try {
                                            await driveAPI.shareFile(item.file_id, [user.id], 'reader')
                                            await loadSharedByMe(true)
                                            window.dispatchEvent(new CustomEvent('drive-shares-updated'))
                                          } catch (err: any) {
                                            alert(`Failed to grant access: ${err.message}`)
                                            await loadSharedByMe(true) // Revert state
                                          } finally {
                                            setTogglingKeys(prev => ({ ...prev, [toggleKey]: false }))
                                          }
                                        } else {
                                          if (!currentShare) {
                                            setTogglingKeys(prev => ({ ...prev, [toggleKey]: false }))
                                            return
                                          }
                                          const originalId = currentShare.id
                                          
                                          // If it's still a temp ID (not resolved by background API yet), we wait or ignore
                                          if (originalId.startsWith('temp-')) {
                                            setTogglingKeys(prev => ({ ...prev, [toggleKey]: false }))
                                            return
                                          }

                                          setSharedByMe(prev => prev.filter(s => s.id !== originalId))

                                          try {
                                            await driveAPI.revokeShare(originalId)
                                            await loadSharedByMe(true)
                                            window.dispatchEvent(new CustomEvent('drive-shares-updated'))
                                          } catch (err: any) {
                                            alert(`Failed to revoke access: ${err.message}`)
                                            await loadSharedByMe(true) // Revert state
                                          } finally {
                                            setTogglingKeys(prev => ({ ...prev, [toggleKey]: false }))
                                          }
                                        }
                                      }}
                                      className="rounded text-[#4A1F6F] focus:ring-[#4A1F6F] h-4 w-4 border-gray-300 cursor-pointer"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <span className="font-bold text-gray-800 text-xs block truncate">{user.name}</span>
                                      <span className="text-[10px] text-gray-500 block truncate capitalize">
                                        {user.role} • {user.email}
                                      </span>
                                    </div>
                                    {isChecked && (
                                      <span className="text-[9px] px-2 py-0.5 bg-[#4A1F6F] text-white rounded-full capitalize font-bold shrink-0">
                                        {currentShare?.permission || 'reader'}
                                      </span>
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* Shared With Me Tab */}
      {tab === 'shared-with-me' && (
        <div className="card p-0">
          {isFetching ? (
            <div className="text-center py-20 text-gray-400 animate-pulse">
              Loading files...
            </div>
          ) : sharedWithMe.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              No files shared with you yet
            </div>
          ) : (
            <div className="table-wrapper border-0 overflow-x-auto w-full no-scrollbar">
              <table className="table min-w-[750px]">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Shared by</th>
                    <th>Permission</th>
                    <th>Shared on</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sharedWithMe.map((share) => (
                    <tr key={share.id}>
                      <td>
                        <a
                          href={share.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`hover:underline inline-flex items-center gap-2 whitespace-nowrap ${!share.viewed ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
                          onClick={() => handleOpenShare(share)}
                        >
                          {share.file_name}
                          {!share.viewed && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>}
                          <ExternalLink size={14} className="shrink-0" />
                        </a>
                      </td>
                      <td className="whitespace-nowrap">{share.shared_by_user?.name}</td>
                      <td className="whitespace-nowrap capitalize">{share.permission}</td>
                      <td className="whitespace-nowrap">{new Date(share.shared_at).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap">
                        <a
                          href={share.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary inline-flex items-center gap-2"
                          onClick={() => handleOpenShare(share)}
                        >
                          <ExternalLink size={16} />
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold">Upload File</h3>
              <button onClick={() => setShowUpload(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6">
              <input
                type="file"
                name="file"
                required
                className="input"
              />
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="btn-primary flex-1">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold">New Folder</h3>
              <button onClick={() => setShowNewFolder(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-6">
              <input
                type="text"
                name="folderName"
                placeholder="Folder name"
                required
                className="input"
              />
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowNewFolder(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <ShareModal
          file={showShare}
          onClose={() => setShowShare(null)}
          onSuccess={() => {
            setShowShare(null)
            loadSharedByMe()
          }}
        />
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col p-6 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
              <LogOut size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Disconnect Google Drive?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to disconnect? You can reconnect your Google account anytime.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {disconnecting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Disconnecting…
                  </>
                ) : (
                  'Disconnect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}

// Share Modal Component
function ShareModal({ file, onClose, onSuccess }: { file: DriveFile; onClose: () => void; onSuccess: () => void }) {
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [permission, setPermission] = useState<'reader' | 'writer' | 'commenter'>('reader')
  const [message, setMessage] = useState('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    fetch(`${BACKEND_URL}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setEmployees(d.data?.users || []))
  }, [])

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee')
      return
    }

    setSharing(true)
    try {
      await driveAPI.shareFile(file.id, selectedEmployees, permission, message)
      onSuccess()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSharing(false)
    }
  }

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold">Share "{file.name}"</h3>
            <p className="text-sm text-gray-500 mt-1">Select employees to share with</p>
          </div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleShare} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Permission</label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as any)}
                className="input"
              >
                <option value="reader">View only</option>
                <option value="commenter">Comment</option>
                <option value="writer">Edit</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message for recipients..."
                className="input h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Select Employees ({selectedEmployees.length} selected)
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {employees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={sharing} className="btn-primary flex-1">
              {sharing ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
