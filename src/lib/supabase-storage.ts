/**
 * Supabase Storage Utilities
 * Handles selfie uploads and downloads
 */

import { supabase } from './supabase'

/**
 * Upload selfie directly to Supabase Storage
 * No API route needed - uses client anon key with RLS
 */
export async function uploadSelfie(
  file: File,
  employeeId: string
): Promise<string> {
  try {
    console.log('Uploading selfie directly to Supabase:', file.name, 'File size:', file.size)

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${employeeId}/${timestamp}-${file.name}`

    console.log('📤 Uploading to storage:', filename)

    // Upload directly to Supabase storage
    const { data, error } = await supabase.storage
      .from('selfies')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('❌ Storage upload failed:', error)
      throw new Error(error.message || 'Failed to upload to storage')
    }

    console.log('✅ Upload successful:', data.path)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('selfies')
      .getPublicUrl(filename)

    console.log('✅ Public URL:', urlData.publicUrl)
    return urlData.publicUrl
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
