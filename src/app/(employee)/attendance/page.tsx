'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { uploadSelfie } from '@/lib/supabase-storage'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Camera, MapPin, CheckCircle, Loader2, LogOut } from 'lucide-react'
import { formatTimeIST } from '@/lib/time-utils'

export default function AttendancePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // ALWAYS create refs - don't make them conditional
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)

  const [cameraActive,  setCameraActive]  = useState(false)
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null)
  const [selfieBlob,    setSelfieBlob]    = useState<Blob | null>(null)
  const [gpsData,       setGpsData]       = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  const [gpsLoading,    setGpsLoading]    = useState(false)
  const [gpsError,      setGpsError]      = useState<string | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitMsg,     setSubmitMsg]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [todayRecord,   setTodayRecord]   = useState<any>(null)

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    const t = localStorage.getItem('authToken')
    fetch(`/api/attendance/today`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        console.log('Attendance page - Today response:', JSON.stringify(d, null, 2))
        console.log('Attendance page - Record:', d.attendance)
        setTodayRecord(d.attendance || null)
      })
      .catch((err) => {
        console.error('Error fetching today attendance:', err)
      })
  }, [user])

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(t => t.stop())
      }
    }
  }, [])

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user)     return null

  const handleOpenCamera = async () => {
    // Prevent opening camera if already checked in
    if (alreadyCheckedIn) {
      setSubmitMsg({ type: 'error', text: 'Attendance already marked for today' })
      return
    }

    setSelfieDataUrl(null)
    setSelfieBlob(null)
    setSubmitMsg(null)
    handleGetGPS()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => console.error('Play error:', e))
        setCameraActive(true)
      }
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: 'Camera error: ' + err.message })
    }
  }

  const handleStopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const handleCapture = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) { setSubmitMsg({ type: 'error', text: 'Camera not ready' }); return }
    if (video.videoWidth === 0) { setSubmitMsg({ type: 'error', text: 'Video not ready. Wait a moment.' }); return }

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setSelfieDataUrl(dataUrl)
    canvas.toBlob((blob) => { if (blob) setSelfieBlob(blob) }, 'image/jpeg', 0.85)
    handleStopCamera()
  }

  const handleRetake = () => {
    setSelfieDataUrl(null)
    setSelfieBlob(null)
    handleOpenCamera()
  }

  const handleGetGPS = () => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return }
    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsData({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setGpsLoading(false)
      },
      (err) => {
        if (err.code === 3) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setGpsData({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy })
              setGpsLoading(false)
            },
            (fallbackErr) => {
              const msg = fallbackErr.code === 1 ? 'Permission denied' : fallbackErr.code === 2 ? 'Position unavailable' : 'Timeout'
              setGpsError(msg)
              setGpsLoading(false)
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
          )
        } else {
          const msg = err.code === 1 ? 'Permission denied' : err.code === 2 ? 'Position unavailable' : 'Timeout'
          setGpsError(msg)
          setGpsLoading(false)
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    )
  }

  const handleMarkAttendance = async () => {
    // Double-check before submitting
    if (alreadyCheckedIn) {
      setSubmitMsg({ type: 'error', text: 'Attendance already marked for today' })
      return
    }

    if (!selfieBlob || !gpsData) {
      setSubmitMsg({ type: 'error', text: 'Please capture selfie and GPS first' })
      return
    }

    setSubmitting(true)
    setSubmitMsg({ type: 'success', text: 'Uploading...' })

    try {
      const selfieFile = new File([selfieBlob], 'selfie.jpg', { type: 'image/jpeg' })
      const selfieURL  = await uploadSelfie(selfieFile, user.id)

      let address = 'Unknown'
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${gpsData.latitude}&lon=${gpsData.longitude}`
        )
        const geoData = await geo.json()
        address = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Unknown'
      } catch {}

      setSubmitMsg({ type: 'success', text: 'Marking attendance...' })

      const t = localStorage.getItem('authToken')
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          employeeId: user.id,
          latitude:   gpsData.latitude,
          longitude:  gpsData.longitude,
          accuracy:   gpsData.accuracy,
          selfieURL,
          address,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitMsg({ type: 'error', text: data.error || 'Failed' })
      } else {
        setSubmitMsg({ type: 'success', text: '✓ Attendance marked!' })
        setSelfieDataUrl(null)
        setSelfieBlob(null)
        setGpsData(null)
        // Refresh today's record immediately
        const t2 = localStorage.getItem('authToken')
        const r2 = await fetch('/api/attendance/today', { headers: { Authorization: `Bearer ${t2}` } })
        const d2 = await r2.json()
        setTodayRecord(d2.attendance || null)
      }
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckout = async () => {
    setSubmitting(true)
    try {
      const t = localStorage.getItem('authToken')
      const res = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitMsg({ type: 'success', text: data.message || '✓ Checked out!' })
        const r2 = await fetch('/api/attendance/today', { headers: { Authorization: `Bearer ${t}` } })
        const d2 = await r2.json()
        setTodayRecord(d2.attendance || null)
      } else {
        setSubmitMsg({ type: 'error', text: data.error || 'Failed to checkout' })
      }
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const alreadyCheckedIn  = !!todayRecord?.check_in
  const alreadyCheckedOut = !!todayRecord?.check_out
  const canSubmit = !!selfieBlob && !!gpsData && !submitting

  return (
    <PageWrapper title="Mark Attendance" subtitle={`Welcome, ${user.name}`}>
      <div className="max-w-xl space-y-5">

        {/* Today's record */}
        {todayRecord && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-3">Today's Record</p>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-400">Check In</p>
                <p className="text-sm font-semibold">{formatTimeIST(todayRecord.check_in)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Check Out</p>
                <p className="text-sm font-semibold">{formatTimeIST(todayRecord.check_out)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p className="text-sm font-semibold capitalize">{todayRecord.status?.replace(/_/g, ' ') || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Already checked in — show checkout */}
        {alreadyCheckedIn && !alreadyCheckedOut && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-3">You are checked in. Ready to check out?</p>
            <button onClick={handleCheckout} disabled={submitting}
              className="w-full py-2.5 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              {submitting ? 'Processing...' : 'Check Out'}
            </button>
          </div>
        )}

        {/* Complete */}
        {alreadyCheckedIn && alreadyCheckedOut && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-sm text-green-700 font-medium">Attendance complete for today!</p>
          </div>
        )}

        {/* Check-in flow */}
        {!alreadyCheckedIn && (
          <>
            {/* Step 1 — Selfie + GPS */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selfieBlob ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                  {selfieBlob ? '✓' : '1'}
                </div>
                <h2 className="font-semibold">Take Selfie & Get Location</h2>
              </div>

              {/* Captured selfie preview */}
              {selfieDataUrl && (
                <div className="mb-4 relative">
                  <img src={selfieDataUrl} alt="Selfie" className="w-full rounded-lg border border-gray-200" style={{ maxHeight: '280px', objectFit: 'cover' }} />
                  <button onClick={handleRetake} className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-lg">Retake</button>
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-lg">✓ Captured</div>
                </div>
              )}

              {/* GPS status */}
              {gpsLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" /> Getting location...
                </div>
              )}
              {gpsData && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">✓ Location Detected</p>
                  <p className="text-xs text-gray-600">Lat: {gpsData.latitude.toFixed(6)} | Lng: {gpsData.longitude.toFixed(6)}</p>
                  <p className="text-xs text-gray-500">Accuracy: ±{Math.round(gpsData.accuracy)}m</p>
                </div>
              )}
              {gpsError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <p className="text-sm text-red-700">{gpsError}</p>
                  <button onClick={handleGetGPS} className="ml-auto text-xs text-red-600 underline">Retry</button>
                </div>
              )}

              {/* Video — always in DOM, hidden when not active */}
              <div style={{ display: cameraActive ? 'block' : 'none' }} className="mb-4 space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black w-full" style={{ aspectRatio: '4/3', minHeight: '240px' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block', backgroundColor: '#000' }} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCapture}
                    className="flex-1 py-2.5 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 flex items-center justify-center gap-2">
                    <Camera size={16} /> Capture
                  </button>
                  <button onClick={handleStopCamera} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && !selfieDataUrl && (
                <button onClick={handleOpenCamera}
                  className="w-full py-2.5 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 flex items-center justify-center gap-2">
                  <Camera size={16} /> Open Camera
                </button>
              )}
            </div>

            {/* Step 2 — Submit */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${canSubmit ? 'bg-black text-white' : 'bg-gray-200'}`}>2</div>
                <h2 className="font-semibold">Submit Attendance</h2>
              </div>

              <div className="mb-4 space-y-2">
                <div className={`flex items-center gap-2 text-sm ${selfieBlob ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle size={14} /> Selfie {selfieBlob ? '✓ ready' : 'pending'}
                </div>
                <div className={`flex items-center gap-2 text-sm ${gpsData ? 'text-green-600' : 'text-gray-400'}`}>
                  <MapPin size={14} /> GPS {gpsData ? '✓ ready' : 'pending'}
                </div>
              </div>

              <button onClick={handleMarkAttendance} disabled={!canSubmit}
                className="w-full py-3 px-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : '✓ Mark Attendance'}
              </button>
            </div>
          </>
        )}

        {/* Status message */}
        {submitMsg && (
          <div className={`rounded-xl p-4 text-sm font-medium ${submitMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {submitMsg.text}
          </div>
        )}

      </div>
    </PageWrapper>
  )
}
