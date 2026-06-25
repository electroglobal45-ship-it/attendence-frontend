/**
 * Supabase Auth Helper for Next.js API Routes
 *
 * Validates tokens directly via Supabase Admin client (getUser).
 * No dependency on the Express backend — works in both local and production.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client — bypasses RLS, used only server-side
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Extract the Bearer token from the request.
 * Checks Authorization header first, then the authToken cookie.
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return req.cookies.get('authToken')?.value || null
}

/**
 * Get authenticated user from request.
 * Validates the Supabase JWT directly — no backend call needed.
 * Returns user profile or null if invalid / expired.
 */
export async function getAuthenticatedUser(req: NextRequest) {
  try {
    const token = extractToken(req)

    if (!token) {
      console.log('❌ No token found in Authorization header or cookies')
      return null
    }

    // Verify JWT directly with Supabase Admin
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      console.log('❌ Invalid token:', error?.message)
      return null
    }

    // Fetch user profile from our users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, category, is_active')
      .eq('email', user.email!)
      .maybeSingle()

    if (profileError || !profile) {
      console.log('❌ No profile found for user:', user.email)
      return null
    }

    if (!profile.is_active) {
      console.log('❌ User inactive')
      return null
    }

    console.log('✅ Token verified for user:', profile.email, 'role:', profile.role)

    return {
      userId: profile.id,
      email: profile.email as string,
      role: profile.role as string,
      profile,
    }
  } catch (error) {
    console.error('❌ Auth error:', error)
    return null
  }
}

/**
 * Verify user is authenticated — throws if not.
 */
export async function requireAuth(req: NextRequest) {
  const user = await getAuthenticatedUser(req)

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Verify user is admin — throws if not authenticated or not admin.
 */
export async function requireAdmin(req: NextRequest) {
  const user = await requireAuth(req)

  if (user.role !== 'admin') {
    console.log('❌ User is not admin:', user.role)
    throw new Error('Forbidden: Admin access required')
  }

  console.log('✅ Admin access granted')
  return user
}
