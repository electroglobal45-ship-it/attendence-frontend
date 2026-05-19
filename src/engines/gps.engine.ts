/**
 * GPS Engine
 * Uses the Haversine formula to calculate distance between two GPS coordinates.
 * Validates whether an employee is within the allowed office radius.
 */

const EARTH_RADIUS_METERS = 6371000

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Haversine formula — calculates distance in meters between two lat/lng points
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

/**
 * Validates if employee is within the allowed office radius
 * Returns true if attendance is allowed
 */
export function isWithinOfficeRadius(
  employeeLat: number,
  employeeLon: number,
  officeLat: number,
  officeLon: number,
  allowedRadiusMeters: number
): { allowed: boolean; distanceMeters: number } {
  const distance = calculateDistance(employeeLat, employeeLon, officeLat, officeLon)
  return {
    allowed: distance <= allowedRadiusMeters,
    distanceMeters: Math.round(distance),
  }
}
