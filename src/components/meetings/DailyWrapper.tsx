'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Video, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

interface DailyWrapperProps {
  meetingId: string
  roomName: string
  onLeave: () => void
  onMuteChange?: (muted: boolean) => void
}

export default function DailyWrapper({ meetingId, roomName, onLeave, onMuteChange }: DailyWrapperProps) {
  const { user } = useAuth()
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setErrorMsg(null)
    setRoomUrl(null)

    const fetchRoom = async () => {
      try {
        // Fetch room URL from our backend
        const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken')
        const res = await fetch(`${BACKEND_URL}/api/v1/meetings/${meetingId}/daily-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roomName }),
        })

        if (cancelled) return

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData?.message || errData?.error || `Server error ${res.status}`)
        }

        const json = await res.json()
        const url: string = json?.data?.url || json?.url
        if (!url) throw new Error('Meeting room URL not received from server')

        if (!cancelled) {
          // Append user name as a query param so Daily.co prebuilt UI pre-fills it
          const fullUrl = `${url}?userName=${encodeURIComponent(user?.name || 'User')}`
          setRoomUrl(fullUrl)
          setStatus('ready')
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err.message || 'Failed to load meeting room')
          setStatus('error')
        }
      }
    }

    fetchRoom()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, roomName, retryKey])

  const handleRetry = () => {
    setRetryKey(k => k + 1)
  }

  return (
    <div className="w-full h-full relative bg-[#1E0A2E]">

      {/* Loading State */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 bg-[#1E0A2E] flex flex-col items-center justify-center text-purple-200 gap-4">
          <div className="relative">
            <Video className="text-[#D9A441]" size={40} />
            <Loader2 className="absolute -bottom-1 -right-1 text-purple-400 animate-spin" size={20} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Setting up your meeting room…</p>
            <p className="text-xs text-purple-400 mt-1">Please wait while we connect you</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 bg-[#1E0A2E] flex flex-col items-center justify-center text-purple-200 gap-4 p-6">
          <AlertCircle className="text-red-400" size={40} />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Failed to connect</p>
            <p className="text-xs text-red-300 mt-2 max-w-[280px] leading-relaxed">{errorMsg}</p>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#4A1F6F] hover:bg-[#3B1859] text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <RefreshCw size={12} /> Retry
            </button>
            <button
              onClick={onLeave}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-900/40 hover:bg-red-900 border border-red-800/60 text-red-200 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Daily.co Prebuilt iframe — loads when URL is ready */}
      {status === 'ready' && roomUrl && (
        <iframe
          key={retryKey}
          src={roomUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; speaker-selection"
          allowFullScreen
          className="w-full h-full border-0 absolute inset-0"
          title="Video Meeting"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
        />
      )}
    </div>
  )
}
