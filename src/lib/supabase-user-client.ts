/**
 * Supabase User Client
 * 
 * Creates a Supabase client with the user's access token
 * This respects RLS policies and runs queries as the authenticated user
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Create a Supabase client authenticated with the user's access token
 * This client respects RLS policies
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

/**
 * Get authenticated Supabase client from request
 * Returns null if no valid token found
 */
export function getAuthenticatedClient(req: NextRequest): SupabaseClient | null {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const accessToken = authHeader.substring(7)
  return createUserClient(accessToken)
}

/**
 * Get authenticated Supabase client or throw error
 */
export function requireAuthenticatedClient(req: NextRequest): SupabaseClient {
  const client = getAuthenticatedClient(req)
  
  if (!client) {
    throw new Error('Unauthorized: No valid access token')
  }
  
  return client
}
