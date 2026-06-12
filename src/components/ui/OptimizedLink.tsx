/**
 * Optimized Link Component
 * Provides faster navigation with prefetching and transitions
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTransition } from 'react'

interface OptimizedLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode
}

export function OptimizedLink({ children, href, onClick, ...props }: OptimizedLinkProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e)
    }

    // Use startTransition for smoother navigation
    if (!e.defaultPrevented && typeof href === 'string') {
      e.preventDefault()
      startTransition(() => {
        router.push(href)
      })
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      prefetch={true}
      {...props}
    >
      {children}
    </Link>
  )
}
