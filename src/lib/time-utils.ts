/**
 * Time utility functions for IST timezone
 */

/**
 * Convert UTC timestamp to IST and format for display
 * IST is UTC + 5 hours 30 minutes
 * 
 * IMPORTANT: Handles multiple timestamp formats:
 * - ISO format: 2026-05-25T04:48:53.851Z
 * - PostgreSQL format: 2026-05-25 04:48:53.851+00
 * - Without timezone: 2026-05-25 04:48:53.851
 */
export function formatTimeIST(utcTimestamp: string | null): string {
  if (!utcTimestamp) return '—'
  
  try {
    let timestamp = utcTimestamp.trim()
    
    // Handle PostgreSQL timestamp format: "2026-05-25 04:48:53.851+00"
    // Convert to ISO format by replacing space with T and +00 with Z
    if (timestamp.includes(' ') && !timestamp.includes('T')) {
      timestamp = timestamp.replace(' ', 'T')
      if (timestamp.endsWith('+00')) {
        timestamp = timestamp.replace('+00', 'Z')
      } else if (!timestamp.endsWith('Z')) {
        timestamp = timestamp + 'Z'
      }
    } else if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
      // Add Z if no timezone indicator
      timestamp = timestamp + 'Z'
    }
    
    // Create date object from UTC timestamp
    const date = new Date(timestamp)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date after conversion:', utcTimestamp, '→', timestamp)
      return '—'
    }
    
    // Format in IST timezone
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    })
  } catch (error) {
    console.error('Error formatting time:', error, utcTimestamp)
    return '—'
  }
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

export function parseTimestampToDate(ts: string | null): Date | null {
  if (!ts) return null
  try {
    let timestamp = ts.trim()
    // Handle PostgreSQL timestamp format: "2026-05-25 04:48:53.851+00"
    // Convert to ISO format by replacing space with T and +00/offset with Z
    if (timestamp.includes(' ') && !timestamp.includes('T')) {
      timestamp = timestamp.replace(' ', 'T')
      if (timestamp.endsWith('+00')) {
        timestamp = timestamp.replace('+00', 'Z')
      } else if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
        timestamp = timestamp + 'Z'
      }
    } else if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
      // Add Z if no timezone indicator
      timestamp = timestamp + 'Z'
    }
    
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) {
      const fallback = new Date(ts)
      return isNaN(fallback.getTime()) ? null : fallback
    }
    return d
  } catch {
    return null
  }
}

/**
 * Calculate hours between two timestamps
 */
export function calculateHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '—'
  
  const start = parseTimestampToDate(checkIn)
  const end = parseTimestampToDate(checkOut)
  if (!start || !end) return '—'
  
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  if (isNaN(hours) || hours <= 0) return '0.0h'
  
  return `${hours.toFixed(1)}h`
}

/**
 * Calculate decimal hours between check-in and check-out
 */
export function calculateHoursNumeric(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0
  
  const start = parseTimestampToDate(checkIn)
  const end = parseTimestampToDate(checkOut)
  if (!start || !end) return 0
  
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  if (isNaN(hours) || hours <= 0) return 0
  
  return parseFloat(hours.toFixed(2))
}

