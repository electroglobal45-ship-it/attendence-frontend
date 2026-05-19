/**
 * Time utility functions for IST timezone
 */

/**
 * Convert UTC timestamp to IST and format for display
 * IST is UTC + 5 hours 30 minutes
 * 
 * IMPORTANT: Handles timestamps with or without 'Z' suffix
 * PostgreSQL timestamp columns may not include 'Z', so we add it if missing
 */
export function formatTimeIST(utcTimestamp: string | null): string {
  if (!utcTimestamp) return '—'
  
  // Ensure timestamp has Z suffix to indicate UTC
  // PostgreSQL 'timestamp' columns don't include Z, but 'timestamptz' does
  const timestamp = utcTimestamp.endsWith('Z') ? utcTimestamp : utcTimestamp + 'Z'
  
  // Create date object from UTC timestamp
  const date = new Date(timestamp)
  
  // Format in IST timezone
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  })
}

/**
 * Format date in IST
 */
export function formatDateIST(utcTimestamp: string): string {
  // Ensure timestamp has Z suffix
  const timestamp = utcTimestamp.endsWith('Z') ? utcTimestamp : utcTimestamp + 'Z'
  const date = new Date(timestamp)
  
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  })
}

/**
 * Calculate hours between two timestamps
 */
export function calculateHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '—'
  
  // Ensure timestamps have Z suffix
  const checkInTimestamp = checkIn.endsWith('Z') ? checkIn : checkIn + 'Z'
  const checkOutTimestamp = checkOut.endsWith('Z') ? checkOut : checkOut + 'Z'
  
  const start = new Date(checkInTimestamp)
  const end = new Date(checkOutTimestamp)
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  
  return `${hours.toFixed(1)}h`
}
