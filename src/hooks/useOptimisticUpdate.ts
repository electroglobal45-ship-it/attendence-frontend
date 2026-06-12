/**
 * Optimistic UI Update Hook
 * Updates UI immediately, then syncs with backend
 */

import { useState, useCallback } from 'react'

export function useOptimisticUpdate<T>(initialData: T) {
  const [data, setData] = useState<T>(initialData)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const optimisticUpdate = useCallback(
    async (
      optimisticValue: T,
      apiCall: () => Promise<any>,
      onSuccess?: (result: any) => void,
      onError?: (error: any) => void
    ) => {
      // 1. Update UI immediately
      const previousData = data
      setData(optimisticValue)
      setError(null)
      setIsUpdating(true)

      try {
        // 2. Call backend
        const result = await apiCall()
        
        // 3. Confirm success
        setIsUpdating(false)
        
        if (onSuccess) {
          onSuccess(result)
        }
      } catch (err: any) {
        // 4. Revert on failure
        setData(previousData)
        setError(err.message || 'Update failed')
        setIsUpdating(false)
        
        if (onError) {
          onError(err)
        }
      }
    },
    [data]
  )

  const reset = useCallback(() => {
    setError(null)
    setIsUpdating(false)
  }, [])

  return {
    data,
    setData,
    isUpdating,
    error,
    optimisticUpdate,
    reset,
  }
}
