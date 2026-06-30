'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { uploadSelfie } from '@/lib/supabase-storage'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Camera, MapPin, CheckCircle, Loader2, LogOut, Calendar, AlertCircle } from 'lucide-react'
import { formatTimeIST } from '@/lib/time-utils'
import { checkAttendanceAllowed, getTodayIST, formatDateIST } from '@/lib/date-utils'
import { attendanceAPI } from '@/lib/tasks-api'
import { usePrefetchStore } from '@/lib/store/prefetch-store'

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
  
  // Markout states
  const [markoutMode,      setMarkoutMode]      = useState(false)
  const [markoutSelfie,    setMarkoutSelfie]    = useState<string | null>(null)
  const [markoutSelfieBlob, setMarkoutSelfieBlob] = useState<Blob | null>(null)
  const [markoutGPS,       setMarkoutGPS]       = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  
  // Read from prefetch store
  const { holidays, todayAttendance: storeAttendance, updateTodayAttendance, status, isPrefetched, prefetchAll } = usePrefetchStore()
  const [todayRecord, setTodayRecord] = useState<any>(storeAttendance)

  // Sync local todayRecord from store
  useEffect(() => {
    setTodayRecord(storeAttendance)
    if (storeAttendance?.check_in) {
      localStorage.setItem(`checked-in-date-${user?.id}`, new Date().toDateString())
    }
    if (storeAttendance?.check_out) {
      localStorage.setItem(`checked-out-date-${user?.id}`, new Date().toDateString())
    }
  }, [storeAttendance, user?.id])

  const [cachedCheckedIn, setCachedCheckedIn] = useState(false)
  const [cachedCheckedOut, setCachedCheckedOut] = useState(false)

  useEffect(() => {
    if (!user) return
    const todayStr = new Date().toDateString()
    setCachedCheckedIn(localStorage.getItem(`checked-in-date-${user.id}`) === todayStr)
    setCachedCheckedOut(localStorage.getItem(`checked-out-date-${user.id}`) === todayStr)
  }, [user])
  
  const [attendanceBlocked, setAttendanceBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState<string>('')
  const [hasOptedIn, setHasOptedIn] = useState(false)
  const [showOptInModal, setShowOptInModal] = useState(false)
  const [optInReason, setOptInReason] = useState('')
  const [optingIn, setOptingIn] = useState(false)
 
  // Computed values
  const alreadyCheckedIn  = !!todayRecord?.check_in || cachedCheckedIn
  const alreadyMarkedOut = !!todayRecord?.check_out || cachedCheckedOut
  const canSubmit = !!selfieBlob && !!gpsData && !submitting
 
  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [user, isLoading, router])

  // If not yet prefetched (e.g. page reload), trigger prefetch
  useEffect(() => {
    if (user && !isPrefetched && status.holidays === 'idle') {
      prefetchAll()
    }
  }, [user, isPrefetched, status.holidays, prefetchAll])

  // Check if attendance is blocked
  useEffect(() => {
    const checkOptIn = async () => {
      if (!user) return
      
      const today = getTodayIST()
      const check = checkAttendanceAllowed(today, holidays)
      
      // Check if today is Sunday or 3rd Saturday
      const dayOfWeek = new Date(today).getDay()
      const dayOfMonth = new Date(today).getDate()
      const isSunday = dayOfWeek === 0
      const isThirdSaturday = dayOfWeek === 6 && dayOfMonth >= 15 && dayOfMonth <= 21
      
      if (isSunday || isThirdSaturday) {
        // Check if user has opted in for today
        const t = localStorage.getItem('authToken')
        try {
          const res = await fetch(`/api/attendance/opt-in-working-day`, {
            headers: { Authorization: `Bearer ${t}` }
          })
          if (res.ok) {
            const data = await res.json()
            const todayOptIn = data.optIns?.find((opt: any) => opt.date === today)
            if (todayOptIn) {
              setHasOptedIn(true)
              setAttendanceBlocked(false)
              setBlockReason('')
              setSubmitMsg(null) // Clear any previous messages
              return
            }
          }
        } catch (err) {
          console.error('Error checking opt-in:', err)
        }
      }
      
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
      
      // After 6:30 PM (1110 minutes) - only block check-in, not markout
      if (totalMinutes >= 1110 && !alreadyCheckedIn) {
        setAttendanceBlocked(true)
        setBlockReason('Office hours ended at 6:30 PM. Please contact admin if you need to mark attendance.')
      }
    }
    
    checkOptIn()
  }, [holidays, alreadyCheckedIn, user])


  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(t => t.stop())
      }
    }
  }, [])

  const isStoreLoading = status.attendance === 'loading' && !storeAttendance
  if (isLoading || isStoreLoading) return (
    <PageWrapper title="Mark Attendance" subtitle="Loading...">
      <div className="max-w-xl mx-auto px-4 sm:px-0 space-y-4 sm:space-y-5 pb-6">
        <div className="bg-white border border-gray-205 rounded-xl p-6 shadow-sm flex items-center justify-center min-h-[200px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-[#4A1F6F]" />
            <p className="text-sm font-semibold text-slate-500">Checking your attendance logs...</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
  if (!user) return null

  const handleOpenCamera = async () => {
    // Check if attendance is blocked
    if (!markoutMode && attendanceBlocked) {
      setSubmitMsg({ type: 'error', text: blockReason })
      return
    }

    // Prevent opening camera if already checked in (for check-in mode)
    if (!markoutMode && alreadyCheckedIn) {
      setSubmitMsg({ type: 'error', text: 'Attendance already marked for today' })
      return
    }

    if (markoutMode) {
      setMarkoutSelfie(null)
      setMarkoutSelfieBlob(null)
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
    
    if (markoutMode) {
      setMarkoutSelfie(dataUrl)
      canvas.toBlob((blob) => { if (blob) setMarkoutSelfieBlob(blob) }, 'image/jpeg', 0.85)
    } else {
      setSelfieDataUrl(dataUrl)
      canvas.toBlob((blob) => { if (blob) setSelfieBlob(blob) }, 'image/jpeg', 0.85)
    }
    
    handleStopCamera()
  }

  const handleRetake = () => {
    if (markoutMode) {
      setMarkoutSelfie(null)
      setMarkoutSelfieBlob(null)
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
        if (markoutMode) {
          setMarkoutGPS(gps)
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
              if (markoutMode) {
                setMarkoutGPS(gps)
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

      await attendanceAPI.markAttendance({
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        accuracy: gpsData.accuracy,
        selfieURL,
        address,
      })

      setSubmitMsg({ type: 'success', text: '✓ Attendance marked!' })
      setSelfieDataUrl(null)
      setSelfieBlob(null)
      setGpsData(null)
      
      // Update local storage cache
      localStorage.setItem(`checked-in-date-${user.id}`, new Date().toDateString())
      setCachedCheckedIn(true)

      // Refresh today's record and update store so Home page also reflects change
      const response = await attendanceAPI.getTodayAttendance()
      const fresh = response.data.attendance || null
      setTodayRecord(fresh)
      updateTodayAttendance(fresh)
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkout = async () => {
    // Validate both selfie and GPS for markout
    if (!markoutSelfieBlob) {
      setSubmitMsg({ type: 'error', text: 'Please capture your markout selfie first' })
      return
    }

    if (!markoutGPS) {
      setSubmitMsg({ type: 'error', text: 'Please enable GPS location for markout' })
      return
    }

    setSubmitting(true)
    setSubmitMsg({ type: 'success', text: 'Uploading markout data...' })

    try {
      // Upload markout selfie
      const selfieFile = new File([markoutSelfieBlob], 'markout-selfie.jpg', { type: 'image/jpeg' })
      const markoutSelfieURL = await uploadSelfie(selfieFile, user.id)

      let address = 'Unknown'
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${markoutGPS.latitude}&lon=${markoutGPS.longitude}`
        )
        const geoData = await geo.json()
        address = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Unknown'
      } catch {}

      await attendanceAPI.markOut({
        latitude: markoutGPS.latitude,
        longitude: markoutGPS.longitude,
        accuracy: markoutGPS.accuracy,
        markoutSelfieURL,
        address,
      })

      setSubmitMsg({ type: 'success', text: '✓ Marked out!' })
      setMarkoutMode(false)
      setMarkoutSelfie(null)
      setMarkoutSelfieBlob(null)
      setMarkoutGPS(null)
      
      // Update local storage cache
      localStorage.setItem(`checked-out-date-${user.id}`, new Date().toDateString())
      setCachedCheckedOut(true)

      // Refresh and update store
      const response = await attendanceAPI.getTodayAttendance()
      const fresh = response.data.attendance || null
      setTodayRecord(fresh)
      updateTodayAttendance(fresh)
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOptInForToday = async () => {
    const today = getTodayIST()
    const dayOfWeek = new Date(today).getDay()
    const dayOfMonth = new Date(today).getDate()
    
    let type = ''
    if (dayOfWeek === 0) type = 'sunday'
    else if (dayOfWeek === 6 && dayOfMonth >= 15 && dayOfMonth <= 21) type = 'third_saturday'
    else {
      setSubmitMsg({ type: 'error', text: 'Today is not a Sunday or 3rd Saturday' })
      return
    }

    setOptingIn(true)
    try {
      const t = localStorage.getItem('authToken')
      const res = await fetch('/api/attendance/opt-in-working-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          date: today,
          type,
          reason: optInReason || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setHasOptedIn(true)
        setAttendanceBlocked(false)
        setShowOptInModal(false)
        setOptInReason('')
        setSubmitMsg({ type: 'success', text: '✓ You can now mark attendance for today!' })
      } else {
        // If already opted in, just close modal and show success
        if (data.error?.includes('already opted in')) {
          setHasOptedIn(true)
          setAttendanceBlocked(false)
          setShowOptInModal(false)
          setOptInReason('')
          setSubmitMsg({ type: 'success', text: '✓ You can now mark attendance for today!' })
        } else {
          setSubmitMsg({ type: 'error', text: data.error || 'Failed to opt-in' })
        }
      }
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message })
    } finally {
      setOptingIn(false)
    }
  }

  return (
    <PageWrapper title="Mark Attendance" subtitle={`Welcome back, ${user?.name}`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6 pb-12 font-sans">

        {/* Attendance Blocked Message */}
        {attendanceBlocked && !alreadyCheckedIn && !hasOptedIn && (
          <div className="bg-[#4A1F6F]/5 border-l-4 border-[#4A1F6F] rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
              <Calendar size={24} className="text-[#4A1F6F] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-[#2D0F47] text-base mb-1">Attendance Not Required</p>
                <p className="text-sm text-purple-900/80 leading-relaxed">{blockReason}</p>
              </div>
            </div>
            {(new Date(getTodayIST()).getDay() === 0 || (new Date(getTodayIST()).getDay() === 6 && new Date(getTodayIST()).getDate() >= 15 && new Date(getTodayIST()).getDate() <= 21)) && (
              <button 
                onClick={() => setShowOptInModal(true)}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl font-semibold hover:opacity-95 shadow-md transition-all flex items-center justify-center gap-2 touch-manipulation cursor-pointer active:scale-98"
              >
                <Calendar size={18} className="text-[#D9A441]" />
                I Want to Work Today
              </button>
            )}
          </div>
        )}

        {/* Working on Sunday/Saturday Badge */}
        {hasOptedIn && !alreadyCheckedIn && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-2xl p-5 shadow-sm flex items-start gap-4">
            <CheckCircle size={24} className="text-emerald-650 flex-shrink-0 mt-0.5 text-emerald-650" />
            <div className="flex-1">
              <p className="font-bold text-emerald-900 text-base mb-1">Working on {new Date(getTodayIST()).getDay() === 0 ? 'Sunday' : '3rd Saturday'}</p>
              <p className="text-sm text-emerald-700/90 leading-relaxed">You can mark your attendance today. This day will count as a working day.</p>
            </div>
          </div>
        )}

        {/* Today's record */}
        {todayRecord && (
          <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-4 bg-[#D9A441] rounded-full" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Attendance Summary</p>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center sm:text-left">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Check In</p>
                <p className="text-base font-extrabold text-[#2D0F47]">{formatTimeIST(todayRecord.check_in)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Mark Out</p>
                <p className="text-base font-extrabold text-[#2D0F47]">{formatTimeIST(todayRecord.check_out)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Status</p>
                <div className="flex items-center justify-center sm:justify-start">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#4A1F6F] border border-purple-100/50 capitalize shadow-2xs">
                    {todayRecord.status?.replace(/_/g, ' ') || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Already checked in — show markout trigger */}
        {alreadyCheckedIn && !alreadyMarkedOut && !markoutMode && (
          <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-sm text-center sm:text-left space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 text-base">You are currently Checked In</h3>
              <p className="text-sm text-gray-500 mt-1">Ready to call it a day? Mark your checkout details below.</p>
            </div>
            <button 
              onClick={() => setMarkoutMode(true)} 
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl font-bold hover:opacity-95 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation cursor-pointer active:scale-98"
            >
              <LogOut size={18} className="text-[#D9A441]" />
              Start Mark Out Process
            </button>
          </div>
        )}

        {/* Markout flow with GPS + Selfie */}
        {alreadyCheckedIn && !alreadyMarkedOut && markoutMode && (
          <div className="space-y-6">
            {/* Markout Step 1 — Selfie + GPS */}
            <div className="bg-white border border-slate-200/85 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${markoutSelfieBlob ? 'bg-emerald-500 text-white shadow-xs' : 'bg-purple-100 text-[#4A1F6F]'}`}>
                  {markoutSelfieBlob ? '✓' : '1'}
                </div>
                <h2 className="font-bold text-gray-800 text-lg">Mark Out Selfie & Location</h2>
              </div>

              {/* Captured markout selfie preview */}
              {markoutSelfie && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-h-[320px]">
                  <img src={markoutSelfie} alt="Mark Out Selfie" className="w-full h-full object-cover" style={{ maxHeight: '320px' }} />
                  <button 
                    onClick={handleRetake} 
                    className="absolute top-3 right-3 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Retake
                  </button>
                  <div className="absolute bottom-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">✓ Captured Successfully</div>
                </div>
              )}

              {/* GPS status */}
              {gpsLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-150 rounded-xl p-3">
                  <Loader2 size={16} className="animate-spin text-[#4A1F6F]" /> 
                  <span className="font-medium">Acquiring highly accurate GPS coordinates...</span>
                </div>
              )}
              {markoutGPS && (
                <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-emerald-700">✓ Location Lock Achieved</p>
                  <p className="text-xs font-mono text-gray-600 break-all">Latitude: {markoutGPS.latitude.toFixed(6)} | Longitude: {markoutGPS.longitude.toFixed(6)}</p>
                  <p className="text-xs text-gray-500">Accuracy Buffer: ±{Math.round(markoutGPS.accuracy)}m</p>
                </div>
              )}
              {gpsError && (
                <div className="bg-red-50 border border-red-200/60 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="text-red-650 flex-shrink-0" size={18} />
                  <p className="text-sm text-red-700 flex-1 font-medium">{gpsError}</p>
                  <button 
                    onClick={handleGetGPS} 
                    className="text-xs font-bold text-red-600 hover:text-red-800 underline whitespace-nowrap cursor-pointer"
                  >
                    Retry Position
                  </button>
                </div>
              )}

              {/* Video Camera Container */}
              <div style={{ display: cameraActive ? 'block' : 'none' }} className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black w-full border border-slate-250 shadow-inner" style={{ aspectRatio: '4/3', minHeight: '240px', maxHeight: '400px' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block', backgroundColor: '#000' }} 
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleCapture}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl font-bold hover:opacity-95 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <Camera size={18} className="text-[#D9A441]" /> Capture Selfie
                  </button>
                  <button 
                    onClick={handleStopCamera} 
                    className="px-5 py-3 border border-slate-200 text-slate-650 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && !markoutSelfie && (
                <button 
                  onClick={handleOpenCamera}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl font-bold hover:opacity-95 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Camera size={18} className="text-[#D9A441]" /> Open Camera
                </button>
              )}
            </div>

            {/* Markout Step 2 — Submit */}
            <div className="bg-white border border-slate-200/85 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${markoutSelfieBlob && markoutGPS ? 'bg-[#2D0F47] text-white shadow-xs' : 'bg-gray-150 text-gray-400'}`}>2</div>
                <h2 className="font-bold text-gray-800 text-lg">Complete Mark Out</h2>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className={`flex items-center gap-2 text-sm font-semibold ${markoutSelfieBlob ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle size={16} className="flex-shrink-0" /> Selfie {markoutSelfieBlob ? '✓ Ready' : 'Pending'}
                </div>
                <div className={`flex items-center gap-2 text-sm font-semibold ${markoutGPS ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <MapPin size={16} className="flex-shrink-0" /> GPS Lock {markoutGPS ? '✓ Configured' : 'Pending'}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setMarkoutMode(false)}
                  className="flex-1 py-3.5 px-4 border border-slate-200 text-slate-650 rounded-xl font-bold hover:bg-slate-50 transition-all cursor-pointer text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleMarkout} 
                  disabled={!markoutSelfieBlob || !markoutGPS || submitting}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl font-bold hover:opacity-95 disabled:from-slate-200 disabled:to-slate-350 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer text-sm sm:text-base active:scale-98"
                >
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><LogOut size={18} className="text-[#D9A441]" /> Complete Mark Out</>}
                </button>
              </div>
              
              {(!markoutSelfieBlob || !markoutGPS) && (
                <p className="text-xs text-slate-400 text-center font-medium">
                  {!markoutSelfieBlob && !markoutGPS ? 'Please capture selfie and lock your GPS to mark out.' : 
                   !markoutSelfieBlob ? 'Please capture your checkout selfie to mark out.' : 
                   'GPS coordinates lock required to mark out.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Complete */}
        {alreadyCheckedIn && alreadyMarkedOut && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3.5 shadow-xs">
            <CheckCircle size={24} className="text-emerald-650 flex-shrink-0" />
            <div>
              <p className="text-emerald-900 font-bold text-base">Attendance Complete!</p>
              <p className="text-emerald-700 text-xs sm:text-sm mt-0.5">Your work logs for today have been successfully recorded.</p>
            </div>
          </div>
        )}

        {/* Check-in flow */}
        {!alreadyCheckedIn && !attendanceBlocked && (
          <div className="space-y-6">
            {/* Step 1 — Selfie + GPS */}
            <div className="bg-white border border-slate-200/85 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${selfieBlob ? 'bg-emerald-500 text-white shadow-xs' : 'bg-purple-100 text-[#4A1F6F]'}`}>
                  {selfieBlob ? '✓' : '1'}
                </div>
                <h2 className="font-bold text-gray-800 text-lg">Take Selfie & Get Location</h2>
              </div>

              {/* Captured selfie preview */}
              {selfieDataUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-h-[320px]">
                  <img src={selfieDataUrl} alt="Selfie" className="w-full h-full object-cover" style={{ maxHeight: '320px' }} />
                  <button 
                    onClick={handleRetake} 
                    className="absolute top-3 right-3 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Retake
                  </button>
                  <div className="absolute bottom-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">✓ Captured Successfully</div>
                </div>
              )}

              {/* GPS status */}
              {gpsLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-150 rounded-xl p-3">
                  <Loader2 size={16} className="animate-spin text-[#4A1F6F]" /> 
                  <span className="font-medium">Acquiring highly accurate GPS coordinates...</span>
                </div>
              )}
              {gpsData && (
                <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-emerald-700">✓ Location Lock Achieved</p>
                  <p className="text-xs font-mono text-gray-600 break-all">Latitude: {gpsData.latitude.toFixed(6)} | Longitude: {gpsData.longitude.toFixed(6)}</p>
                  <p className="text-xs text-gray-500">Accuracy Buffer: ±{Math.round(gpsData.accuracy)}m</p>
                </div>
              )}
              {gpsError && (
                <div className="bg-red-50 border border-red-200/60 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="text-red-650 flex-shrink-0" size={18} />
                  <p className="text-sm text-red-700 flex-1 font-medium">{gpsError}</p>
                  <button 
                    onClick={handleGetGPS} 
                    className="text-xs font-bold text-red-600 hover:text-red-800 underline whitespace-nowrap cursor-pointer"
                  >
                    Retry Position
                  </button>
                </div>
              )}

              {/* Video Camera Container */}
              <div style={{ display: cameraActive ? 'block' : 'none' }} className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black w-full border border-slate-250 shadow-inner" style={{ aspectRatio: '4/3', minHeight: '240px', maxHeight: '400px' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block', backgroundColor: '#000' }} 
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleCapture}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl font-bold hover:opacity-95 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <Camera size={18} className="text-[#D9A441]" /> Capture Selfie
                  </button>
                  <button 
                    onClick={handleStopCamera} 
                    className="px-5 py-3 border border-slate-200 text-slate-650 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && !selfieDataUrl && (
                <button 
                  onClick={handleOpenCamera}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl font-bold hover:opacity-95 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Camera size={18} className="text-[#D9A441]" /> Open Camera
                </button>
              )}
            </div>

            {/* Step 2 — Submit */}
            <div className="bg-white border border-slate-200/85 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${canSubmit ? 'bg-[#2D0F47] text-white shadow-xs' : 'bg-gray-150 text-gray-400'}`}>2</div>
                <h2 className="font-bold text-gray-800 text-lg">Submit Attendance Check-In</h2>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className={`flex items-center gap-2 text-sm font-semibold ${selfieBlob ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle size={16} className="flex-shrink-0" /> Selfie {selfieBlob ? '✓ Ready' : 'Pending'}
                </div>
                <div className={`flex items-center gap-2 text-sm font-semibold ${gpsData ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <MapPin size={16} className="flex-shrink-0" /> GPS Lock {gpsData ? '✓ Configured' : 'Pending'}
                </div>
              </div>

              <button 
                onClick={handleMarkAttendance} 
                disabled={!canSubmit || submitting}
                className="w-full py-4 px-4 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl font-bold hover:opacity-95 disabled:from-slate-200 disabled:to-slate-350 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer text-base active:scale-98"
              >
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Processing Check-In...</> : '✓ Mark Attendance'}
              </button>
              
              {!canSubmit && (
                <p className="text-xs text-slate-400 text-center font-medium">
                  {!selfieBlob && !gpsData ? 'Please capture selfie and lock your GPS to check-in.' : 
                   !selfieBlob ? 'Please capture your check-in selfie to mark attendance.' : 
                   'GPS coordinates lock required to check-in.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Global Toast Status message */}
        {submitMsg && (
          <div className={`rounded-xl p-4 text-sm font-bold shadow-xs border ${submitMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {submitMsg.text}
          </div>
        )}

      </div>

      {/* Opt-In Modal */}
      {showOptInModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 animate-fade-in shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Work on {new Date(getTodayIST()).getDay() === 0 ? 'Sunday' : '3rd Saturday'}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Opt-in to work today. This day will count as a working day for salary calculation.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason (optional)</label>
              <textarea 
                value={optInReason} 
                onChange={(e) => setOptInReason(e.target.value)}
                placeholder="Brief reason for working today..." 
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4A1F6F] focus:border-transparent outline-none resize-none text-sm" 
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setShowOptInModal(false); setOptInReason('') }} 
                disabled={optingIn}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleOptInForToday} 
                disabled={optingIn}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#4A1F6F] to-[#2D0F47] text-white rounded-xl hover:opacity-95 font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {optingIn ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
