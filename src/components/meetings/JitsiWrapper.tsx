'use client'

import React from 'react'
import { JitsiMeeting } from '@jitsi/react-sdk'
import { useAuth } from '@/lib/auth-context'

interface JitsiWrapperProps {
  roomName: string
  onLeave: () => void
  onMuteChange?: (muted: boolean) => void
}

export default function JitsiWrapper({ roomName, onLeave, onMuteChange }: JitsiWrapperProps) {
  const { user } = useAuth()

  const displayName = user?.name || 'User'
  const email = user?.email || ''

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false, // Bypass prejoin screen for instant join
          disableInviteFunctions: true, // Internal only meeting
          enableWelcomePage: false,
          toolbarButtons: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'chat',
            'raisehand',
            'tileview',
            'videoquality',
          ],
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#0f172a',
        }}
        userInfo={{
          displayName,
          email,
        }}
        onReadyToClose={onLeave}
        onApiReady={(externalApi) => {
          externalApi.addListener('audioMuteStatusChanged', (event: { muted: boolean }) => {
            if (onMuteChange) {
              onMuteChange(event.muted)
            }
          })
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.width = '100%'
          iframeRef.style.height = '100%'
          iframeRef.style.border = 'none'
        }}
      />
    </div>
  )
}
