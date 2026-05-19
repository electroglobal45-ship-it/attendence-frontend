/**
 * Supabase Server Client
 *
 * Uses SERVICE_ROLE_KEY — bypasses RLS for server-side API routes.
 * NEVER import this in client components or expose to the browser.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase server environment variables (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
}

// Custom fetch to handle SSL certificate issues in development
const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
  // In development, disable SSL verification
  if (process.env.NODE_ENV === 'development') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
  return fetch(url, options)
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: customFetch,
  },
})
