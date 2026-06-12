/**
 * Loading Skeleton Component
 * Provides visual feedback while content is loading
 */

export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

export function TableLoadingSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <LoadingSkeleton className="h-6 w-3/4" />
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  )
}

export function StatsLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <LoadingSkeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton className="h-8 w-16" />
            <LoadingSkeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
