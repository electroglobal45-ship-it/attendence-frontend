/**
 * Supabase Auth Helper for Next.js API Routes
 *
 * Validates tokens by calling the Express backend (/api/v1/auth/me).
 * This keeps auth consistent with the rest of the app — the backend
 * handles Supabase token refresh automatically, so we never get
 * "token is expired" errors from hitting Supabase Auth directly.
 */

import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

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
 * Validates the token by calling the backend /auth/me endpoint.
 * Returns user profile or null if invalid / expired.
 */
export async function getAuthenticatedUser(req: NextRequest) {
  try {
    const token = extractToken(req)

    if (!token) {
      console.log('❌ No token found in Authorization header or cookies')
      return null
    }

    // Validate via Express backend — it handles Supabase refresh internally
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Short timeout so we don't block the route handler for too long
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      console.log('❌ Invalid token:', response.status, response.statusText)
      return null
    }

    const json = await response.json()
    const profile = json?.data

    if (!profile) {
      console.log('❌ No profile in backend response')
      return null
    }

    if (!profile.is_active) {
      console.log('❌ User inactive')
      return null
    }

    console.log('✅ Token verified via backend for user:', profile.email, 'role:', profile.role)

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

