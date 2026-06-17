'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function DebugAuthPage() {
  const { user } = useAuth()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [testResult, setTestResult] = useState<string>('')
  const [localData, setLocalData] = useState<any>(null)

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken')
    setAuthToken(token)

    // Decode JWT token
    if (token) {
      try {
        const parts = token.split('.')
        const payload = JSON.parse(atob(parts[1]))
        setTokenInfo(payload)
      } catch (e) {
        console.error('Failed to decode token:', e)
      }
    }

    setLocalData({
      authToken: localStorage.getItem('authToken') ? 'EXISTS' : 'MISSING',
      user: localStorage.getItem('user') ? 'EXISTS' : 'MISSING',
      supabase_session: localStorage.getItem('supabase_session') ? 'EXISTS' : 'MISSING',
    })
  }, [])

  const testAPI = async () => {
    setTestResult('Testing...')
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/attendance/today', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setTestResult(`Status: ${res.status}\nResponse: ${JSON.stringify(data, null, 2)}`)
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>

      {/* User Info */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <h2 className="font-semibold mb-2">User from Context:</h2>
        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      {/* Token Info */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <h2 className="font-semibold mb-2">Auth Token:</h2>
        {authToken ? (
          <>
            <p className="text-xs text-gray-600 mb-2 break-all">{authToken}</p>
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p className="font-medium mb-1">Token Length: {authToken.length}</p>
              <p className="font-medium mb-1">Starts with: {authToken.substring(0, 20)}...</p>
            </div>
          </>
        ) : (
          <p className="text-red-600">❌ No token found in localStorage</p>
        )}
      </div>

      {/* Decoded Token */}
      {tokenInfo && (
        <div className="bg-white border rounded-lg p-4 mb-4">
          <h2 className="font-semibold mb-2">Decoded Token:</h2>
          <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(tokenInfo, null, 2)}
          </pre>
          <div className="mt-2">
            <p className="text-sm">
              <span className="font-medium">Expires:</span>{' '}
              {new Date(tokenInfo.exp * 1000).toLocaleString()}
            </p>
            <p className="text-sm">
              <span className="font-medium">Expired:</span>{' '}
              {Date.now() > tokenInfo.exp * 1000 ? (
                <span className="text-red-600">❌ Yes</span>
              ) : (
                <span className="text-green-600">✅ No</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Test API */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <h2 className="font-semibold mb-2">Test API Call:</h2>
        <button
          onClick={testAPI}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Test /api/attendance/today
        </button>
        {testResult && (
          <pre className="bg-gray-50 p-3 rounded text-sm mt-3 overflow-auto">
            {testResult}
          </pre>
        )}
      </div>

      {/* LocalStorage Contents */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">LocalStorage Contents:</h2>
        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
          {localData ? JSON.stringify(localData, null, 2) : 'Loading...'}
        </pre>
      </div>
    </div>
  )
}
