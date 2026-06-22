/**
 * cookie-utils.ts
 * Centralised cookie helper — automatically applies Secure flag in production.
 * All auth cookie reads/writes should go through these helpers.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Set a cookie with the correct security flags for the current environment.
 * - SameSite=Lax  → CSRF protection
 * - Secure         → HTTPS-only (production only, so localhost still works)
 */
export function setSecureCookie(name: string, value: string, maxAge = 604800): void {
  if (typeof document === 'undefined') return
  const secure = IS_PRODUCTION ? '; Secure' : ''
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
}

/**
 * Clear / expire a cookie with the same flags used when setting it.
 */
export function clearSecureCookie(name: string): void {
  if (typeof document === 'undefined') return
  const secure = IS_PRODUCTION ? '; Secure' : ''
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secure}`
}
