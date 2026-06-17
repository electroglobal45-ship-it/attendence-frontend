'use client'

/**
 * MeetingRecorder
 * Uses the browser MediaRecorder API to record the screen (+ audio) during a meeting.
 * No server/API key needed — recording is saved locally as a .webm download.
 */

import { useRef, useState, useEffect } from 'react'
import { Circle, Square, Download, Cloud, Check, Loader2 } from 'lucide-react'
import { driveAPI } from '@/lib/drive-api'

interface MeetingRecorderProps {
  meetingTitle: string
  isMuted: boolean
}

export default function MeetingRecorder({ meetingTitle, isMuted }: MeetingRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [isDriveConnected, setIsDriveConnected] = useState(false)
  const [savingToDrive, setSavingToDrive] = useState(false)
  const [driveSaved, setDriveSaved] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobUrlRef = useRef<string | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)

  // 1. Fetch connection status on mount
  useEffect(() => {
    driveAPI.getConnectionStatus()
      .then(status => {
        setIsDriveConnected(!!status.connected)
      })
      .catch(() => {
        setIsDriveConnected(false)
      })
  }, [])

  // 2. Synchronize mic mute state with the isMuted prop
  useEffect(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted
      })
    }
  }, [isMuted])

  const startRecording = async () => {
    setError(null)
    chunksRef.current = []
    setDriveSaved(false)

    try {
      // Get microphone audio stream
      let micStream: MediaStream | null = null
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Apply initial mute state
        micStream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted
        })
        micStreamRef.current = micStream
      } catch (micErr) {
        console.warn('Microphone access denied or not available:', micErr)
      }

      // Get display media (tab audio + video)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 854 },
          height: { max: 480 },
          frameRate: { max: 15 }
        },
        audio: true,
        preferCurrentTab: true,
      } as any)

      // Setup Web Audio API mixing
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioCtx()
      const destination = audioContext.createMediaStreamDestination()
      let hasAudioTracks = false

      // Add display audio track if present
      const displayAudioTracks = displayStream.getAudioTracks()
      if (displayAudioTracks.length > 0) {
        const displaySource = audioContext.createMediaStreamSource(new MediaStream([displayAudioTracks[0]]))
        displaySource.connect(destination)
        hasAudioTracks = true
      }

      // Add microphone audio track if present
      if (micStream) {
        const micAudioTracks = micStream.getAudioTracks()
        if (micAudioTracks.length > 0) {
          const micSource = audioContext.createMediaStreamSource(new MediaStream([micAudioTracks[0]]))
          micSource.connect(destination)
          hasAudioTracks = true
        }
      }

      // Construct final combined stream
      const tracks = [...displayStream.getVideoTracks()]
      if (hasAudioTracks) {
        tracks.push(...destination.stream.getAudioTracks())
      } else if (displayAudioTracks.length > 0) {
        tracks.push(displayAudioTracks[0])
      }

      const combinedStream = new MediaStream(tracks)

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm',
        videoBitsPerSecond: 250000, // 250 kbps (highly compressed)
        audioBitsPerSecond: 48000,  // 48 kbps
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        // Stop all tracks so indicator/mic usage stops
        displayStream.getTracks().forEach((t) => t.stop())
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop())
          micStreamRef.current = null
        }
        try {
          audioContext.close()
        } catch (e) {
          // ignore
        }

        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        blobUrlRef.current = URL.createObjectURL(blob)
        setHasRecording(true)
        setRecording(false)
      }

      // Also handle the user stopping the share from the browser chrome
      displayStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') recorder.stop()
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Screen sharing was denied.')
      } else {
        setError('Could not start recording. Please try again.')
      }
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
  }

  const downloadRecording = () => {
    if (!blobUrlRef.current) return
    const safeTitle = meetingTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const a = document.createElement('a')
    a.href = blobUrlRef.current
    a.download = `${safeTitle}-recording.webm`
    a.click()
  }

  const saveToGoogleDrive = async () => {
    if (!chunksRef.current.length) return
    setSavingToDrive(true)
    setError(null)
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const safeTitle = meetingTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const file = new File([blob], `${safeTitle}-recording.webm`, { type: 'video/webm' })

      // 1. Search for 'Meeting Recordings' folder
      const searchResults = await driveAPI.searchFiles('Meeting Recordings')
      let folder = searchResults.find(f => f.name === 'Meeting Recordings' && f.mimeType === 'application/vnd.google-apps.folder')
      
      let folderId = undefined
      if (folder) {
        folderId = folder.id
      } else {
        // Create the folder
        const newFolder = await driveAPI.createFolder('Meeting Recordings')
        folderId = newFolder.id
      }

      // 2. Upload file to folder
      await driveAPI.uploadFile(file, folderId)
      setDriveSaved(true)
    } catch (err: any) {
      setError(err.message || 'Failed to save recording to Google Drive')
    } finally {
      setSavingToDrive(false)
    }
  }

  if (error) {
    return (
      <span className="text-xs text-red-400 px-2">
        {error}
        <button
          onClick={() => setError(null)}
          className="ml-1 underline hover:text-red-300"
        >
          Dismiss
        </button>
      </span>
    )
  }

  if (hasRecording) {
    return (
      <div className="flex items-center gap-2">
        <button
          id="meeting-download-recording"
          onClick={downloadRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition"
          title="Download recording"
        >
          <Download size={14} />
          Download
        </button>
        {isDriveConnected && (
          <button
            onClick={saveToGoogleDrive}
            disabled={savingToDrive || driveSaved}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition text-white ${
              driveSaved 
                ? 'bg-blue-600 cursor-default' 
                : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
            }`}
          >
            {savingToDrive ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving to Drive...
              </>
            ) : driveSaved ? (
              <>
                <Check size={14} />
                Saved to Drive!
              </>
            ) : (
              <>
                <Cloud size={14} />
                Save to Drive
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  if (recording) {
    return (
      <button
        id="meeting-stop-recording"
        onClick={stopRecording}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition animate-pulse"
        title="Stop recording"
      >
        <Square size={14} />
        Stop Recording
      </button>
    )
  }

  return (
    <button
      id="meeting-start-recording"
      onClick={startRecording}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-xs font-medium rounded-lg transition border border-slate-600"
      title="Record this meeting"
    >
      <Circle size={14} className="text-red-400" />
      Record
    </button>
  )
}
