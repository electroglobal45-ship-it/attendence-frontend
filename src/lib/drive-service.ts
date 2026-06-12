/**
 * Google Drive Service (Server-side)
 * Handles all Google Drive API operations
 */

import { google } from 'googleapis'
import { supabaseServer } from './supabase-server'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/drive/callback'
)

export class DriveService {
  // ═══════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════

  static getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid'
    ]

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent'
    })
  }

  static async handleCallback(userId: string, code: string) {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    // Calculate token expiry - tokens.expiry_date is milliseconds timestamp
    const expiryDate = tokens.expiry_date 
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000) // Default 1 hour

    const now = new Date().toISOString()

    await supabaseServer
      .from('google_drive_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        token_expiry: expiryDate.toISOString(),
        google_email: data.email || null,
        scope: tokens.scope || null,
        connected_at: now,
        updated_at: now
      }, { onConflict: 'user_id' })

    return { email: data.email }
  }

  static async getConnectionStatus(userId: string) {
    try {
      const { data, error } = await supabaseServer
        .from('google_drive_tokens')
        .select('google_email, connected_at, token_expiry')
        .eq('user_id', userId)
        .single()

      console.log('[Drive] Connection status check:', { userId, hasData: !!data, error })

      if (error || !data) {
        console.log('[Drive] No token found for user:', userId)
        return { connected: false }
      }

      // As long as the user has a database record, they are connected 
      // (we have a refresh token to get a new access token)
      return {
        connected: true,
        email: data.google_email,
        connectedAt: data.connected_at
      }
    } catch (error) {
      console.error('[Drive] Status check error:', error)
      return { connected: false }
    }
  }

  static async disconnect(userId: string) {
    await supabaseServer
      .from('google_drive_tokens')
      .delete()
      .eq('user_id', userId)

    return { success: true }
  }

  // ═══════════════════════════════════════════════════════════
  // TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  static async getValidToken(userId: string): Promise<string> {
    const { data, error } = await supabaseServer
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      throw new Error('Google Drive not connected')
    }

    const expiryDate = new Date(data.token_expiry)
    const now = new Date()

    if (expiryDate <= now) {
      return await this.refreshToken(userId, data.refresh_token)
    }

    return data.access_token
  }

  static async refreshToken(userId: string, refreshToken: string): Promise<string> {
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oauth2Client.refreshAccessToken()

    // Calculate token expiry - credentials.expiry_date is milliseconds timestamp
    const expiryDate = credentials.expiry_date 
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000) // Default 1 hour

    await supabaseServer
      .from('google_drive_tokens')
      .update({
        access_token: credentials.access_token!,
        token_expiry: expiryDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    return credentials.access_token!
  }

  static async getDriveClient(userId: string) {
    const accessToken = await this.getValidToken(userId)
    oauth2Client.setCredentials({ access_token: accessToken })
    return google.drive({ version: 'v3', auth: oauth2Client })
  }

  // ═══════════════════════════════════════════════════════════
  // FILE OPERATIONS
  // ═══════════════════════════════════════════════════════════

  static async listFiles(userId: string, folderId?: string) {
    const drive = await this.getDriveClient(userId)

    let query = "trashed=false"
    if (folderId) {
      query += ` and '${folderId}' in parents`
    } else {
      query += " and 'root' in parents"
    }

    const response = await drive.files.list({
      q: query,
      pageSize: 100,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, iconLink, thumbnailLink, shared)',
      orderBy: 'folder,modifiedTime desc'
    })

    return response.data.files || []
  }

  static async uploadFile(userId: string, file: { originalname: string; mimetype: string; buffer: Buffer }, folderId?: string) {
    const drive = await this.getDriveClient(userId)

    const fileMetadata: any = { name: file.originalname }
    if (folderId) fileMetadata.parents = [folderId]

    const media = {
      mimeType: file.mimetype,
      body: Buffer.from(file.buffer)
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media as any,
      fields: 'id, name, mimeType, size, webViewLink'
    })

    return response.data
  }

  static async createFolder(userId: string, folderName: string, parentFolderId?: string) {
    const drive = await this.getDriveClient(userId)

    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    }
    if (parentFolderId) fileMetadata.parents = [parentFolderId]

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, mimeType, webViewLink'
    })

    return response.data
  }

  static async deleteFile(userId: string, fileId: string) {
    const drive = await this.getDriveClient(userId)
    await drive.files.delete({ fileId })
    return { success: true }
  }

  static async renameFile(userId: string, fileId: string, newName: string) {
    const drive = await this.getDriveClient(userId)
    const response = await drive.files.update({
      fileId,
      requestBody: { name: newName },
      fields: 'id, name, mimeType, modifiedTime'
    })
    return response.data
  }

  static async downloadFile(userId: string, fileId: string) {
    const drive = await this.getDriveClient(userId)
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )
    return response.data
  }

  // ═══════════════════════════════════════════════════════════
  // SHARING
  // ═══════════════════════════════════════════════════════════

  static async shareFile(
    userId: string,
    fileId: string,
    shareWithUserIds: string[],
    permission: 'reader' | 'commenter' | 'writer',
    message?: string
  ) {
    const drive = await this.getDriveClient(userId)

    const file = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, thumbnailLink'
    })

    const { data: users } = await supabaseServer
      .from('users')
      .select('id, email, name')
      .in('id', shareWithUserIds)

    if (!users) throw new Error('Users not found')

    const shares = []

    for (const user of users) {
      await drive.permissions.create({
        fileId,
        requestBody: {
          type: 'user',
          role: permission,
          emailAddress: user.email
        },
        sendNotificationEmail: true,
        emailMessage: message || `${file.data.name} has been shared with you`
      })

      const { data: share } = await supabaseServer
        .from('drive_shares')
        .insert({
          file_id: fileId,
          file_name: file.data.name,
          file_type: file.data.mimeType,
          file_size: file.data.size ? parseInt(file.data.size) : null,
          file_url: file.data.webViewLink,
          thumbnail_url: file.data.thumbnailLink,
          shared_by: userId,
          shared_with: user.id,
          permission,
          message,
          is_folder: file.data.mimeType === 'application/vnd.google-apps.folder'
        })
        .select()
        .single()

      if (share) shares.push(share)
    }

    return shares
  }

  static async getSharedByMe(userId: string) {
    const { data } = await supabaseServer
      .from('drive_shares')
      .select(`
        *,
        shared_with_user:users!drive_shares_shared_with_fkey(id, name, email)
      `)
      .eq('shared_by', userId)
      .order('shared_at', { ascending: false })

    return data || []
  }

  static async getSharedWithMe(userId: string) {
    const { data } = await supabaseServer
      .from('drive_shares')
      .select(`
        *,
        shared_by_user:users!drive_shares_shared_by_fkey(id, name, email)
      `)
      .eq('shared_with', userId)
      .order('shared_at', { ascending: false })

    return data || []
  }

  static async revokeShare(userId: string, shareId: string) {
    const { data: share } = await supabaseServer
      .from('drive_shares')
      .select('*')
      .eq('id', shareId)
      .eq('shared_by', userId)
      .single()

    if (!share) throw new Error('Share not found')

    const { data: user } = await supabaseServer
      .from('users')
      .select('email')
      .eq('id', share.shared_with)
      .single()

    if (user) {
      try {
        const drive = await this.getDriveClient(userId)
        const permissions = await drive.permissions.list({ fileId: share.file_id })
        const permission = permissions.data.permissions?.find((p: any) => p.emailAddress === user.email)
        
        if (permission) {
          await drive.permissions.delete({
            fileId: share.file_id,
            permissionId: permission.id!
          })
        }
      } catch (error) {
        console.warn('Failed to revoke Google Drive permission:', error)
      }
    }

    await supabaseServer
      .from('drive_shares')
      .delete()
      .eq('id', shareId)

    return { success: true }
  }

  static async markAsViewed(shareId: string, userId: string) {
    await supabaseServer
      .from('drive_shares')
      .update({
        viewed: true,
        viewed_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      })
      .eq('id', shareId)
      .eq('shared_with', userId)

    return { success: true }
  }
}
