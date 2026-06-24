'use client'

import { memo } from 'react'
import { Menu } from 'lucide-react'
import { useSidebarStore } from '@/lib/store/sidebar-store'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string | React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
}

// Memoize PageWrapper to prevent re-renders
export const PageWrapper = memo(function PageWrapper({ children, title, subtitle, actions }: PageWrapperProps) {
  const setOpen = useSidebarStore((state) => state.setOpen)

  return (
    <>
      {/* Page header */}
      <div className={`bg-white/80 backdrop-blur-sm border-b border-purple-100/60 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0 ${!title ? 'lg:hidden' : ''}`}>
        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Hamburger menu for mobile */}
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg touch-manipulation flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu size={20} className="sm:w-6 sm:h-6" />
          </button>

          {(title || subtitle) && (
            <div className={`min-w-0 flex-1 ${actions ? 'hidden sm:block' : ''}`}>
              {title && (
                <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate leading-tight">
                  {typeof title === 'string' ? title : <div className="flex items-center">{title}</div>}
                </h1>
              )}
              {subtitle && <p className="hidden sm:block text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          )}
          
          {actions && <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">{actions}</div>}
        </div>
      </div>
      
      {/* Page content */}
      <div className="flex-1 p-4 sm:p-6">{children}</div>
    </>
  )
})
