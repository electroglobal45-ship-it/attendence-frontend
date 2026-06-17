'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface ActiveMeeting {
  id: string
  roomName: string
  title: string
  isHost: boolean
}

interface MeetingsContextType {
  activeMeeting: ActiveMeeting | null
  isMinimized: boolean
  joinMeeting: (id: string, roomName: string, title: string, isHost: boolean) => void
  leaveMeeting: () => void
  setIsMinimized: (val: boolean) => void
}

const MeetingsContext = createContext<MeetingsContextType | undefined>(undefined)

export function MeetingsProvider({ children }: { children: React.ReactNode }) {
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)

  // Auto-leave meeting on logout/refresh if needed (handled by Jitsi client anyway)
  const joinMeeting = (id: string, roomName: string, title: string, isHost: boolean) => {
    setActiveMeeting({ id, roomName, title, isHost })
    setIsMinimized(false) // Start in full view or as user desires
  }

  const leaveMeeting = () => {
    setActiveMeeting(null)
    setIsMinimized(false)
  }

  return (
    <MeetingsContext.Provider
      value={{
        activeMeeting,
        isMinimized,
        joinMeeting,
        leaveMeeting,
        setIsMinimized,
      }}
    >
      {children}
    </MeetingsContext.Provider>
  )
}

export function useMeetings() {
  const context = useContext(MeetingsContext)
  if (context === undefined) {
    throw new Error('useMeetings must be used within a MeetingsProvider')
  }
  return context
}
