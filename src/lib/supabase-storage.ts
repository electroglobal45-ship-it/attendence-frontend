/**
 * Supabase Storage Utilities
 * Handles selfie uploads and downloads
 */

import { supabase } from './supabase'

/**
 * Upload selfie via API route (uses service role to bypass RLS)
 */
export async function uploadSelfie(
  file: File,
  employeeId: string
): Promise<string> {
  try {
    console.log('Uploading selfie via API route:', file.name, 'File size:', file.size)

    // Get auth token from localStorage
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    
    if (!authToken) {
      console.error('❌ No auth token found in localStorage')
      throw new Error('Not authenticated - please login again')
    }

    console.log('✅ Auth token found, length:', authToken.length)

    // Create form data
    const formData = new FormData()
    formData.append('file', file)

    console.log('📤 Sending upload request to /api/upload-selfie')

    // Upload via API route
    const response = await fetch('/api/upload-selfie', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    })

    console.log('📥 Upload response status:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Upload failed:', error)
      throw new Error(error.error || `Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Upload successful:', data.url)
    return data.url
  } catch (error: any) {
    console.error('❌ Error uploading selfie:', error)
    throw new Error(error.message || 'Failed to upload selfie')
  }
}

/**
 * Delete selfie via API route (uses service role)
 */
export async function deleteSelfie(filename: string): Promise<void> {
  try {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    
    if (!authToken) {
      throw new Error('Not authenticated')
    }

    const response = await fetch('/api/delete-selfie', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Delete failed')
    }
  } catch (error: any) {
    console.error('Error deleting selfie:', error)
    throw new Error(error.message || 'Failed to delete selfie')
  }
}

/**
 * Get public URL for selfie
 */
export function getSelfiePublicUrl(filename: string): string {
  const { data } = supabase.storage
    .from('selfies')
    .getPublicUrl(filename)

  return data.publicUrl
}

/**
 * List all selfies for an employee
 */
export async function listEmployeeSelfies(
  employeeId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage
      .from('selfies')
      .list(employeeId)

    if (error) {
      throw new Error(error.message)
    }

    return data.map((file) => `${employeeId}/${file.name}`)
  } catch (error) {
    console.error('Error listing selfies:', error)
    return []
  }
}
