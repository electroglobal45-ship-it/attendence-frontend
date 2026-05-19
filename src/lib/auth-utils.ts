/**
 * Authentication Utilities
 * Password hashing and JWT token management
 */

import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Hash password using PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify password
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === computedHash
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string, email: string, role: string): string {
  console.log('🔑 [generateToken] Creating token for:', { userId, email, role })
  console.log('🔑 [generateToken] JWT_SECRET:', JWT_SECRET ? 'Set' : 'Not set', 'Length:', JWT_SECRET.length)
  
  const token = jwt.sign(
    {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
  
  console.log('✅ [generateToken] Token created, length:', token.length)
  return token
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    console.log('🔍 [verifyToken] Verifying token...')
    console.log('🔍 [verifyToken] JWT_SECRET:', JWT_SECRET ? 'Set' : 'Not set', 'Length:', JWT_SECRET.length)
    console.log('🔍 [verifyToken] Token length:', token.length)
    
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    console.log('✅ [verifyToken] Token verified successfully')
    console.log('👤 [verifyToken] User:', decoded.userId, 'Role:', decoded.role)
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }
  } catch (error: any) {
    console.error('❌ [verifyToken] Token verification failed:', error.message)
    console.error('❌ [verifyToken] Error name:', error.name)
    return null
  }
}

/**
 * Generate random password
 */
export function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
