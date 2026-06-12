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
  
  // Admin routes
  const adminRoutes = [
    '/dashboard',
    '/projects',
    '/tasks',
    '/employees',
    '/users',
    '/calendar',
    '/holidays',
    '/reports',
    '/settings',
    '/board'
  ]
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  
  // Employee routes
  const employeeRoutes = [
    '/home',
    '/attendance',
    '/my-tasks',
    '/my-calendar',
    '/leaves',
    '/salary',
    '/drive'
  ]
  const isEmployeeRoute = employeeRoutes.some(route => pathname.startsWith(route))
  
  // No token + trying to access protected route → redirect to login
  if (!token && !isPublicRoute && (isAdminRoute || isEmployeeRoute)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Has token + on login page → redirect to dashboard
  if (token && pathname === '/login') {
    const redirectUrl = userRole === 'admin' ? '/dashboard' : '/home'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }
  
  // Admin route but user is not admin → redirect to employee home
  if (token && isAdminRoute && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/home', request.url))
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
