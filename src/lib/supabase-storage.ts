/**
 * Supabase Storage Utilities
 * Handles selfie uploads and downloads
 */

import { supabase } from './supabase'

/**
 * Upload selfie directly to Supabase Storage
 */
export async function uploadSelfie(
  file: File,
  employeeId: string
): Promise<string> {
  try {
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${employeeId}/${timestamp}-${file.name}`

    console.log('Uploading selfie to Supabase Storage:', filename, 'File size:', file.size)

    // Upload directly to Supabase Storage
    const { data, error } = await supabase.storage
      .from('selfies')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      throw new Error(error.message || 'Upload failed')
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('selfies')
      .getPublicUrl(filename)

    console.log('Upload successful:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (error: any) {
    console.error('Error uploading selfie:', error)
    throw new Error(error.message || 'Failed to upload selfie')
  }
}

/**
 * Delete selfie from Supabase Storage
 */
export async function deleteSelfie(filename: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('selfies')
      .remove([filename])

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    console.error('Error deleting selfie:', error)
    throw new Error('Failed to delete selfie')
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
