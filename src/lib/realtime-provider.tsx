'use client'

/**
 * RealtimeProvider
 *
 * Subscribes to Supabase Realtime channels the moment the user logs in.
 * Any DB change (INSERT / UPDATE / DELETE) on attendance_records, leave_requests,
 * tasks, or company_holidays is immediately reflected in usePrefetchStore so
 * every page that reads from the store updates without an extra API round-trip.
 *
 * It also acts as the SINGLE place that triggers prefetchAll() — ensuring all
 * dashboard data is loaded once and cached in Zustand. Pages simply read from
 * the store; they never do their own fetches → zero loading spinners on navigation.
 */

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { usePrefetchStore, PrefetchChunk } from '@/lib/store/prefetch-store'
import { useAuth } from '@/lib/auth-context'

// How long to debounce chunk refreshes after a realtime event (ms)
const DEBOUNCE_MS = 350

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const prefetchedRef = useRef(false)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Helper: debounced chunk refresh ────────────────────────────────────────
  const scheduleRefresh = (chunk: PrefetchChunk) => {
    if (debounceTimers.current[chunk]) {
      clearTimeout(debounceTimers.current[chunk])
    }
    debounceTimers.current[chunk] = setTimeout(() => {
      usePrefetchStore.getState().refreshChunk(chunk)
    }, DEBOUNCE_MS)
  }

  useEffect(() => {
    if (!user) return // Not logged in yet

    // ── 1. Prefetch all data once (if not already done) ───────────────────
    const store = usePrefetchStore.getState()
    if (!prefetchedRef.current && !store.isPrefetched) {
      prefetchedRef.current = true
      store.prefetchAll().catch(console.error)
    } else {
      prefetchedRef.current = true
    }

    // ── 2. Subscribe to Supabase Realtime ──────────────────────────────────
    // Tear down any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel('app-realtime')

      // ── Attendance records ────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => {
          // Always refresh today + history so both dashboard and attendance page stay fresh
          scheduleRefresh('attendance')
          scheduleRefresh('history')
        }
      )

      // ── Leave requests ────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        () => {
          scheduleRefresh('leaves')
        }
      )

      // ── Tasks ─────────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          scheduleRefresh('tasks')
        }
      )

      // ── Holidays ──────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_holidays' },
        () => {
          scheduleRefresh('holidays')
        }
      )

      // ── Employees (admin only) ─────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        () => {
          if (user.role === 'admin') {
            scheduleRefresh('employees')
          }
        }
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Connected to Supabase Realtime')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] ⚠️ Channel error — will retry automatically')
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Channel closed')
        }
      })

    channelRef.current = channel

    // ── Cleanup on unmount or user change ────────────────────────────────────
    return () => {
      // Clear all debounce timers
      Object.values(debounceTimers.current).forEach(clearTimeout)
      debounceTimers.current = {}

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user]) // Re-subscribe when user changes (login/logout)

  return <>{children}</>
}
