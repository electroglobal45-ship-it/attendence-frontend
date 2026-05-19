/**
 * Authentication Utilities - Supabase Integration
 * 
 * This file provides utilities for working with Supabase.
 * JWT authentication is handled in auth-utils.ts
 */

import { supabase } from './supabase'

/**
 * Get user by email from Supabase
 */
export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return data
}

/**
 * Get user by ID from Supabase
 */
export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return data
}

/**
 * Update user in Supabase
 */
export async function updateUser(id: string, updates: any) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating user:', error)
    return null
  }

  return data
}

/**
 * Get all users from Supabase
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data || []
}

/**
 * Get office settings from Supabase
 */
export async function getOfficeSettings() {
  const { data, error } = await supabase
    .from('office_settings')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching office settings:', error)
    return null
  }

  return data
}
