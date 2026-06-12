/**
 * Board Skeleton Loader
 * Shows a loading skeleton while the board is fetching data
 */

export function BoardSkeleton() {
  return (
    <div className="h-full bg-gray-50 p-4">
      <div className="flex gap-3 h-full overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-72 bg-white rounded-lg border border-gray-200 p-3"
          >
            {/* List header skeleton */}
            <div className="mb-3">
              <div className="h-5 bg-gray-200 rounded animate-pulse w-32" />
            </div>

            {/* Card skeletons */}
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="bg-gray-100 rounded-lg p-3 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BoardLoadingIndicator() {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div className="bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
        <svg
          className="animate-spin h-5 w-5 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span className="text-sm font-medium text-gray-700">
          Loading board...
        </span>
      </div>
    </div>
  )
}
