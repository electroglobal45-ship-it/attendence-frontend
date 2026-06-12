/**
 * Google Drive API Client
 * Communicates with Next.js API routes for Google Drive operations
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
const API_BASE = `${BACKEND_URL}/api/v1/drive`

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime: string
  modifiedTime: string
  webViewLink?: string
  iconLink?: string
  thumbnailLink?: string
  shared?: boolean
}

interface ShareData {
  id: string
  file_id: string
  file_name: string
  file_type: string
  file_url: string
  shared_by: string
  shared_with: string
  permission: 'reader' | 'writer' | 'commenter'
  shared_at: string
  viewed: boolean
  shared_by_user?: { id: string; name: string; email: string }
  shared_with_user?: { id: string; name: string; email: string }
}

class DriveAPI {
  private getAuthHeader(): string {
    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Not authenticated')
    return `Bearer ${token}`
  }

  // ══════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ══════════════════════════════════════════════════════════

  async getAuthUrl(): Promise<string> {
    const res = await fetch(`${API_BASE}/auth/url`, {
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to get auth URL')
    return data.data.authUrl
  }

  async getConnectionStatus() {
    const res = await fetch(`${API_BASE}/auth/status`, {
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to get status')
    return data.data
  }

  async disconnect() {
    const res = await fetch(`${API_BASE}/auth/disconnect`, {
      method: 'POST',
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to disconnect')
    return data.data
  }

  // ══════════════════════════════════════════════════════════
  // FILE OPERATIONS
  // ══════════════════════════════════════════════════════════

  async listFiles(folderId?: string): Promise<DriveFile[]> {
    const url = new URL(`${API_BASE}/files`, window.location.origin)
    if (folderId) url.searchParams.set('folderId', folderId)
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to list files')
    return data.data.files
  }

  async uploadFile(file: File, folderId?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) formData.append('folderId', folderId)

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: this.getAuthHeader() },
      body: formData
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to upload file')
    return data.data.file
  }

  async createFolder(folderName: string, parentFolderId?: string) {
    const res = await fetch(`${API_BASE}/folder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader()
      },
      body: JSON.stringify({ folderName, parentFolderId })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create folder')
    return data.data.folder
  }

  async deleteFile(fileId: string) {
    const res = await fetch(`${API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to delete file')
    return data.data
  }

  async renameFile(fileId: string, newName: string) {
    const res = await fetch(`${API_BASE}/files/${fileId}/rename`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader()
      },
      body: JSON.stringify({ name: newName })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to rename file')
    return data.data.file
  }

  async downloadFile(fileId: string, fileName: string) {
    const res = await fetch(`${API_BASE}/files/${fileId}/download`, {
      headers: { Authorization: this.getAuthHeader() }
    })
    if (!res.ok) throw new Error('Failed to download file')
    
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  async searchFiles(query: string): Promise<DriveFile[]> {
    const url = new URL(`${API_BASE}/search`, window.location.origin)
    url.searchParams.set('q', query)
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to search files')
    return data.data.files
  }

  // ══════════════════════════════════════════════════════════
  // SHARING
  // ══════════════════════════════════════════════════════════

  async shareFile(
    fileId: string,
    shareWith: string[],
    permission: 'reader' | 'writer' | 'commenter' = 'reader',
    message?: string
  ) {
    const res = await fetch(`${API_BASE}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader()
      },
      body: JSON.stringify({ fileId, shareWith, permission, message })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to share file')
    return data.data.shares
  }

  async getSharedByMe(): Promise<ShareData[]> {
    const res = await fetch(`${API_BASE}/shared/by-me`, {
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to get shared files')
    return data.data.shares
  }

  async getSharedWithMe(): Promise<ShareData[]> {
    const res = await fetch(`${API_BASE}/shared/with-me`, {
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to get shared files')
    return data.data.shares
  }

  async revokeShare(shareId: string) {
    const res = await fetch(`${API_BASE}/share/${shareId}`, {
      method: 'DELETE',
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to revoke share')
    return data.data
  }

  async markAsViewed(shareId: string) {
    const res = await fetch(`${API_BASE}/share/${shareId}/viewed`, {
      method: 'POST',
      headers: { Authorization: this.getAuthHeader() }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to mark as viewed')
    return data.data
  }

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════

  getFileIcon(mimeType: string): string {
    if (mimeType.includes('folder')) return '📁'
    if (mimeType.includes('document')) return '📄'
    if (mimeType.includes('spreadsheet')) return '📊'
    if (mimeType.includes('presentation')) return '📽️'
    if (mimeType.includes('pdf')) return '📕'
    if (mimeType.includes('image')) return '🖼️'
    if (mimeType.includes('video')) return '🎥'
    if (mimeType.includes('audio')) return '🎵'
    return '📎'
  }

  formatFileSize(bytes?: string): string {
    if (!bytes) return '—'
    const size = parseInt(bytes)
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

export const driveAPI = new DriveAPI()
export type { DriveFile, ShareData }
