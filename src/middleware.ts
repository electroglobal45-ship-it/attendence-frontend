/**
 * Next.js Middleware for Server-Side Auth & Performance
 * This runs BEFORE pages load - much faster than client-side checks
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get auth token from cookies
  const token = request.cookies.get('authToken')?.value
  const userRole = request.cookies.get('userRole')?.value
  
  // Public routes that don't need auth
  const publicRoutes = ['/login', '/']
  const isPublicRoute = publicRoutes.includes(pathname)
  
  // Define route classifications
  const isBoardRoute = pathname.startsWith('/projects') || pathname.startsWith('/board')
  
  const adminOnlyRoutes = [
    '/tasks',
    '/users',
    '/calendar',
    '/holidays',
    '/reports',
    '/settings',
    '/vault',
  ]
  const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route))
  
  const employeeRoutes = [
    '/home',
    '/attendance',
    '/my-tasks',
    '/my-calendar',
    '/leaves',
    '/salary',
    '/my-passwords',
  ]
  const isEmployeeRoute = employeeRoutes.some(route => pathname.startsWith(route))
  
  const sharedRoutes = [
    '/drive',
    '/meetings',
    '/messages',
  ]
  const isSharedRoute = sharedRoutes.some(route => pathname.startsWith(route))
  
  const isHrAllowedAdminRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/employees')
  
  // No token + trying to access protected route → redirect to login
  const isProtectedRoute = isBoardRoute || isAdminOnlyRoute || isEmployeeRoute || isSharedRoute || isHrAllowedAdminRoute
  if (!token && !isPublicRoute && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Has token + on login page → redirect to dashboard/home
  if (token && pathname === '/login') {
    const redirectUrl = (userRole === 'admin' || userRole === 'hr') ? '/dashboard' : '/home'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }
  
  if (token) {
    if (userRole === 'admin') {
      // Admins can go anywhere
      return NextResponse.next()
    }
    
    if (userRole === 'hr') {
      // HR only gets dashboard, employees, and shared routes
      const isAllowed = isHrAllowedAdminRoute || isSharedRoute
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else if (userRole === 'team leader') {
      // Team Leaders get employee routes, board routes, and shared routes
      const isAllowed = isEmployeeRoute || isBoardRoute || isSharedRoute
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/home', request.url))
      }
    } else {
      // Regular employees (and any other roles) get employee routes and shared routes only
      const isAllowed = isEmployeeRoute || isSharedRoute
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/home', request.url))
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
}
