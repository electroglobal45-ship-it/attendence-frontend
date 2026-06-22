'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MessagingLayout from '@/components/messaging/MessagingLayout'
import { useSocket } from '@/hooks/useSocket'

export default function MessagesPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  
  // Get token from localStorage (consistent with auth system)
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  
  // Initialize socket connection
  const { isConnected, connectionError } = useSocket(token || undefined)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // Redirect to login if no token
    if (isMounted && !token) {
      router.push('/login')
    }
  }, [token, router, isMounted])

  if (!isMounted || !token) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Connection Status Bar */}
      {connectionError && (
        <div className="bg-red-500 text-white px-4 py-2 text-sm text-center">
          {connectionError}
        </div>
      )}
      {!isConnected && !connectionError && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-sm text-center">
          Connecting to messaging server...
        </div>
      )}
      
      {/* Main Messaging Layout */}
      <MessagingLayout />
    </div>
  )
}
