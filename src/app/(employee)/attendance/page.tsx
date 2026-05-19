'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { uploadSelfie } from '@/lib/supabase-storage'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Camera, MapPin, CheckCircle, Loader2, LogOut, Calendar, AlertCircle } from 'lucide-react'
import { formatTimeIST } from '@/lib/time-utils'
import { checkAttendanceAllowed, getTodayIST, formatDateIST } from '@/lib/date-utils'

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
  
  // Checkout states
  const [checkoutMode,      setCheckoutMode]      = useState(false)
  const [checkoutSelfie,    setCheckoutSelfie]    = useState<string | null>(null)
  const [checkoutSelfieBlob, setCheckoutSelfieBlob] = useState<Blob | null>(null)
  const [checkoutGPS,       setCheckoutGPS]       = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  
  // Holiday/weekend blocking
  const [holidays, setHolidays] = useState<Array<{ name: string; date: string }>>([])
  const [attendanceBlocked, setAttendanceBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState<string>('')

  // Computed values
  const alreadyCheckedIn  = !!todayRecord?.check_in
  const alreadyCheckedOut = !!todayRecord?.check_out
  const canSubmit = !!selfieBlob && !!gpsData && !submitting

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [user, isLoading, router])

  // Fetch holidays on mount
  useEffect(() => {
    fetch('/api/holidays')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch holidays')
        return r.json()
      })
      .then(d => {
        console.log('Holidays fetched:', d)
        if (d.holidays && Array.isArray(d.holidays)) {
          setHolidays(d.holidays.map((h: any) => ({ name: h.name, date: h.date })))
        }
      })
      .catch(err => {
        console.error('Error fetching holidays:', err)
        // Continue without holidays - will only block weekends
        setHolidays([])
      })
  }, [])

  // Check if attendance is blocked
  useEffect(() => {
    const today = getTodayIST()
    const check = checkAttendanceAllowed(today, holidays)
    setAttendanceBlocked(!check.allowed)
    if (!check.allowed) {
      setBlockReason(check.reason || 'Attendance not allowed today')
    }
    
    // Check office hours (9 AM - 6 PM)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istDate = new Date(now.getTime() + istOffset)
    const istHour = istDate.getUTCHours()
    const istMinute = istDate.getUTCMinutes()
    const totalMinutes = istHour * 60 + istMinute
    
    // Before 9:00 AM (540 minutes)
    if (totalMinutes < 540) {
      setAttendanceBlocked(true)
      setBlockReason('Too early! Office hours start at 9:00 AM')
    }
    
    // After 6:00 PM (1080 minutes) - only block check-in, not checkout
    if (totalMinutes >= 1080 && !alreadyCheckedIn) {
      setAttendanceBlocked(true)
      setBlockReason('Office hours ended at 6:00 PM. Please contact admin if you need to mark attendance.')
    }
  }, [holidays, alreadyCheckedIn])

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
    // Check if attendance is blocked
    if (!checkoutMode && attendanceBlocked) {
      setSubmitMsg({ type: 'error', text: blockReason })
      return
    }

    // Prevent opening camera if already checked in (for check-in mode)
    if (!checkoutMode && alreadyCheckedIn) {
      setSubmitMsg({ type: 'error', text: 'Attendance already marked for today' })
      return
    }

    if (checkoutMode) {
      setCheckoutSelfie(null)
      setCheckoutSelfieBlob(null)
    } else {
      setSelfieDataUrl(null)
      setSelfieBlob(null)
    }
    
    setSubmitMsg(null)
    handleGetGPS()

    try {
      // Enhanced camera constraints for better mobile support
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Better mobile playback handling
        const playPromise = videoRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Camera started successfully')
              setCameraActive(true)
            })
            .catch(e => {
              console.error('Play error:', e)
              setSubmitMsg({ type: 'error', text: 'Failed to start camera. Please try again.' })
            })
        } else {
          setCameraActive(true)
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      let errorMsg = 'Camera access denied. Please enable camera permissions in your browser settings.'
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please allow camera access and try again.'
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.'
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is already in use by another app.'
      }
      setSubmitMsg({ type: 'error', text: errorMsg })
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
    
    if (checkoutMode) {
      setCheckoutSelfie(dataUrl)
      canvas.toBlob((blob) => { if (blob) setCheckoutSelfieBlob(blob) }, 'image/jpeg', 0.85)
    } else {
      setSelfieDataUrl(dataUrl)
      canvas.toBlob((blob) => { if (blob) setSelfieBlob(blob) }, 'image/jpeg', 0.85)
    }
    
    handleStopCamera()
  }

  const handleRetake = () => {
    if (checkoutMode) {
      setCheckoutSelfie(null)
      setCheckoutSelfieBlob(null)
    } else {
      setSelfieDataUrl(null)
      setSelfieBlob(null)
    }
    handleOpenCamera()
  }

  const handleGetGPS = () => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported'); return }
    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }
        if (checkoutMode) {
          setCheckoutGPS(gps)
        } else {
          setGpsData(gps)
        }
        setGpsLoading(false)
      },
      (err) => {
        if (err.code === 3) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const gps = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }
              if (checkoutMode) {
                setCheckoutGPS(gps)
              } else {
                setGpsData(gps)
              }
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
    // Check if attendance is blocked
    if (attendanceBlocked) {
      setSubmitMsg({ type: 'error', text: blockReason })
      return
    }

    // Validate both selfie and GPS are captured
    if (!selfieBlob) {
      setSubmitMsg({ type: 'error', text: 'Please capture your selfie first' })
      return
    }

    if (!gpsData) {
      setSubmitMsg({ type: 'error', text: 'Please enable GPS location first' })
      return
    }

    // Double-check before submitting
    if (alreadyCheckedIn) {
      setSubmitMsg({ type: 'error', text: 'Attendance already marked for today' })
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
    // Validate both selfie and GPS for checkout
    if (!checkoutSelfieBlob) {
      setSubmitMsg({ type: 'error', text: 'Please capture your checkout selfie first' })
      return
    }

    if (!checkoutGPS) {
      setSubmitMsg({ type: 'error', text: 'Please enable GPS location for checkout' })
      return
    }

    setSubmitting(true)
    setSubmitMsg({ type: 'success', text: 'Uploading checkout data...' })

    try {
      // Upload checkout selfie
      const selfieFile = new File([checkoutSelfieBlob], 'checkout-selfie.jpg', { type: 'image/jpeg' })
      const checkoutSelfieURL = await uploadSelfie(selfieFile, user.id)

      let address = 'Unknown'
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${checkoutGPS.latitude}&lon=${checkoutGPS.longitude}`
        )
        const geoData = await geo.json()
        address = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Unknown'
      } catch {}

      const t = localStorage.getItem('authToken')
      const res = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          latitude: checkoutGPS.latitude,
          longitude: checkoutGPS.longitude,
          accuracy: checkoutGPS.accuracy,
          checkoutSelfieURL,
          address,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitMsg({ type: 'success', text: data.message || '✓ Checked out!' })
        setCheckoutMode(false)
        setCheckoutSelfie(null)
        setCheckoutSelfieBlob(null)
        setCheckoutGPS(null)
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

  return (
    <PageWrapper title="Mark Attendance" subtitle={`Welcome, ${user.name}`}>
      <div className="max-w-xl mx-auto px-4 sm:px-0 space-y-4 sm:space-y-5 pb-6">

        {/* Attendance Blocked Message */}
        {attendanceBlocked && !alreadyCheckedIn && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 flex items-start gap-3">
            <Calendar size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 mb-1">Attendance Not Required</p>
              <p className="text-sm text-blue-700">{blockReason}</p>
              <p className="text-xs text-blue-600 mt-2">Enjoy your day off! 🎉</p>
            </div>
          </div>
        )}

        {/* Today's record */}
        {todayRecord && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-3">Today&apos;s Record</p>
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
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
                <p className="text-xs sm:text-sm font-semibold capitalize">{todayRecord.status?.replace(/_/g, ' ') || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Already checked in — show checkout */}
        {alreadyCheckedIn && !alreadyCheckedOut && !checkoutMode && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-3">You are checked in. Ready to check out?</p>
            <button onClick={() => setCheckoutMode(true)} disabled={submitting}
              className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation">
              <LogOut size={18} />
              Start Checkout Process
            </button>
          </div>
        )}

        {/* Checkout flow with GPS + Selfie */}
        {alreadyCheckedIn && !alreadyCheckedOut && checkoutMode && (
          <>
            {/* Checkout Step 1 — Selfie + GPS */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${checkoutSelfieBlob ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                  {checkoutSelfieBlob ? '✓' : '1'}
                </div>
                <h2 className="font-semibold text-base sm:text-lg">Checkout Selfie & Location</h2>
              </div>

              {/* Captured checkout selfie preview */}
              {checkoutSelfie && (
                <div className="mb-4 relative">
                  <img src={checkoutSelfie} alt="Checkout Selfie" className="w-full rounded-lg border border-gray-200" style={{ maxHeight: '320px', objectFit: 'cover' }} />
                  <button onClick={handleRetake} className="absolute top-2 right-2 px-3 py-1.5 bg-black/70 text-white text-xs rounded-lg touch-manipulation">Retake</button>
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-lg">✓ Captured</div>
                </div>
              )}

              {/* GPS status */}
              {gpsLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" /> Getting location...
                </div>
              )}
              {checkoutGPS && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">✓ Location Detected</p>
                  <p className="text-xs text-gray-600 break-all">Lat: {checkoutGPS.latitude.toFixed(6)} | Lng: {checkoutGPS.longitude.toFixed(6)}</p>
                  <p className="text-xs text-gray-500">Accuracy: ±{Math.round(checkoutGPS.accuracy)}m</p>
                </div>
              )}
              {gpsError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <p className="text-sm text-red-700 flex-1">{gpsError}</p>
                  <button onClick={handleGetGPS} className="text-xs text-red-600 underline whitespace-nowrap touch-manipulation">Retry</button>
                </div>
              )}

              {/* Video — always in DOM, hidden when not active */}
              <div style={{ display: cameraActive ? 'block' : 'none' }} className="mb-4 space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black w-full" style={{ aspectRatio: '4/3', minHeight: '240px', maxHeight: '400px' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block', backgroundColor: '#000' }} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCapture}
                    className="flex-1 py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 flex items-center justify-center gap-2 touch-manipulation">
                    <Camera size={18} /> Capture
                  </button>
                  <button onClick={handleStopCamera} className="px-4 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 touch-manipulation">
                    Cancel
                  </button>
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && !checkoutSelfie && (
                <button onClick={handleOpenCamera}
                  className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 flex items-center justify-center gap-2 touch-manipulation">
                  <Camera size={18} /> Open Camera
                </button>
              )}
            </div>

            {/* Checkout Step 2 — Submit */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${checkoutSelfieBlob && checkoutGPS ? 'bg-black text-white' : 'bg-gray-200'}`}>2</div>
                <h2 className="font-semibold text-base sm:text-lg">Complete Checkout</h2>
              </div>

              <div className="mb-4 space-y-2">
                <div className={`flex items-center gap-2 text-sm ${checkoutSelfieBlob ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle size={16} className="flex-shrink-0" /> Selfie {checkoutSelfieBlob ? '✓ ready' : 'pending'}
                </div>
                <div className={`flex items-center gap-2 text-sm ${checkoutGPS ? 'text-green-600' : 'text-gray-400'}`}>
                  <MapPin size={16} className="flex-shrink-0" /> GPS {checkoutGPS ? '✓ ready' : 'pending'}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setCheckoutMode(false)}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 touch-manipulation">
                  Cancel
                </button>
                <button onClick={handleCheckout} disabled={!checkoutSelfieBlob || !checkoutGPS || submitting}
                  className="flex-1 py-3.5 px-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation text-base">
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><LogOut size={18} /> Check Out</>}
                </button>
              </div>
              
              {(!checkoutSelfieBlob || !checkoutGPS) && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  {!checkoutSelfieBlob && !checkoutGPS ? 'Capture selfie and enable GPS to continue' : 
                   !checkoutSelfieBlob ? 'Capture your selfie to continue' : 
                   'Enable GPS location to continue'}
                </p>
              )}
            </div>
          </>
        )}

        {/* Complete */}
        {alreadyCheckedIn && alreadyCheckedOut && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">Attendance complete for today!</p>
          </div>
        )}

        {/* Check-in flow */}
        {!alreadyCheckedIn && !attendanceBlocked && (
          <>
            {/* Step 1 — Selfie + GPS */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selfieBlob ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                  {selfieBlob ? '✓' : '1'}
                </div>
                <h2 className="font-semibold text-base sm:text-lg">Take Selfie & Get Location</h2>
              </div>

              {/* Captured selfie preview */}
              {selfieDataUrl && (
                <div className="mb-4 relative">
                  <img src={selfieDataUrl} alt="Selfie" className="w-full rounded-lg border border-gray-200" style={{ maxHeight: '320px', objectFit: 'cover' }} />
                  <button onClick={handleRetake} className="absolute top-2 right-2 px-3 py-1.5 bg-black/70 text-white text-xs rounded-lg touch-manipulation">Retake</button>
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-lg">✓ Captured</div>
                </div>
              )}

              {/* GPS status */}
              {gpsLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" /> Getting location...
                </div>
              )}
              {gpsData && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">✓ Location Detected</p>
                  <p className="text-xs text-gray-600 break-all">Lat: {gpsData.latitude.toFixed(6)} | Lng: {gpsData.longitude.toFixed(6)}</p>
                  <p className="text-xs text-gray-500">Accuracy: ±{Math.round(gpsData.accuracy)}m</p>
                </div>
              )}
              {gpsError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <p className="text-sm text-red-700 flex-1">{gpsError}</p>
                  <button onClick={handleGetGPS} className="text-xs text-red-600 underline whitespace-nowrap touch-manipulation">Retry</button>
                </div>
              )}

              {/* Video — always in DOM, hidden when not active */}
              <div style={{ display: cameraActive ? 'block' : 'none' }} className="mb-4 space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black w-full" style={{ aspectRatio: '4/3', minHeight: '240px', maxHeight: '400px' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block', backgroundColor: '#000' }} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCapture}
                    className="flex-1 py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 flex items-center justify-center gap-2 touch-manipulation">
                    <Camera size={18} /> Capture
                  </button>
                  <button onClick={handleStopCamera} className="px-4 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 touch-manipulation">
                    Cancel
                  </button>
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && !selfieDataUrl && (
                <button onClick={handleOpenCamera}
                  className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 flex items-center justify-center gap-2 touch-manipulation">
                  <Camera size={18} /> Open Camera
                </button>
              )}
            </div>

            {/* Step 2 — Submit */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${canSubmit ? 'bg-black text-white' : 'bg-gray-200'}`}>2</div>
                <h2 className="font-semibold text-base sm:text-lg">Submit Attendance</h2>
              </div>

              <div className="mb-4 space-y-2">
                <div className={`flex items-center gap-2 text-sm ${selfieBlob ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle size={16} className="flex-shrink-0" /> Selfie {selfieBlob ? '✓ ready' : 'pending'}
                </div>
                <div className={`flex items-center gap-2 text-sm ${gpsData ? 'text-green-600' : 'text-gray-400'}`}>
                  <MapPin size={16} className="flex-shrink-0" /> GPS {gpsData ? '✓ ready' : 'pending'}
                </div>
              </div>

              <button onClick={handleMarkAttendance} disabled={!canSubmit}
                className="w-full py-3.5 px-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation text-base">
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : '✓ Mark Attendance'}
              </button>
              
              {!canSubmit && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  {!selfieBlob && !gpsData ? 'Capture selfie and enable GPS to continue' : 
                   !selfieBlob ? 'Capture your selfie to continue' : 
                   'Enable GPS location to continue'}
                </p>
              )}
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
