/**
 * Root page — redirects to login or dashboard based on JWT token
 */
'use client'

import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function RootPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      redirect('/login')
    }

    try {
      const userData = JSON.parse(user)
      const role = userData.role

      if (role === 'admin') {
        redirect('/dashboard')
      } else {
        redirect('/home')
      }
    } catch (error) {
      redirect('/login')
    }
  }, [])

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>
}
