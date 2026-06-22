'use client'

import { useMessagingStore } from '@/store/messaging.store'

interface PresenceIndicatorProps {
  userId: string
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
}

export function PresenceIndicator({ userId, size = 'sm', showStatus = false }: PresenceIndicatorProps) {
  const userPresence = useMessagingStore((state) => state.userPresence[userId])

  const status = userPresence?.status || 'offline'

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  }

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    away: 'Away',
    busy: 'Do Not Disturb',
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`${sizeClasses[size]} ${statusColors[status]} rounded-full border-2 border-white flex-shrink-0`}
        title={statusLabels[status]}
      />
      {showStatus && (
        <span className="text-sm text-gray-600">{statusLabels[status]}</span>
      )}
    </div>
  )
}

interface UserAvatarWithPresenceProps {
  userId: string
  userName: string
  avatarUrl?: string
  size?: 'sm' | 'md' | 'lg'
  showPresence?: boolean
}

export function UserAvatarWithPresence({
  userId,
  userName,
  avatarUrl,
  size = 'md',
  showPresence = true,
}: UserAvatarWithPresenceProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }

  const presenceSizes = {
    sm: 'sm',
    md: 'sm',
    lg: 'md',
  } as const

  return (
    <div className="relative">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={userName}
          className={`${sizeClasses[size]} rounded-lg object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-lg bg-indigo-500 flex items-center justify-center text-white font-semibold`}
        >
          {userName[0]?.toUpperCase() || 'U'}
        </div>
      )}
      
      {showPresence && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <PresenceIndicator userId={userId} size={presenceSizes[size]} />
        </div>
      )}
    </div>
  )
}
