'use client'

import { formatDistanceToNow } from 'date-fns'
import { Bell, Calendar, AlertCircle, CheckCircle, Info } from 'lucide-react'

interface NotificationItemProps {
  notification: any
  onMarkAsRead: (notificationId: string) => void
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const notificationData = notification.notifications
  const isRead = notification.is_read

  // Parse the created_at timestamp properly
  const createdAt = notificationData.created_at 
    ? new Date(notificationData.created_at)
    : new Date()
  
  // Debug log
  console.log('Raw created_at:', notificationData.created_at)
  console.log('Parsed Date:', createdAt)
  console.log('Current Date:', new Date())
  console.log('Time diff:', new Date().getTime() - createdAt.getTime(), 'ms')

  const getIcon = () => {
    switch (notificationData.type) {
      case 'meeting':
        return <Calendar size={18} className="text-blue-500" />
      case 'announcement':
        return <Bell size={18} className="text-purple-500" />
      case 'reminder':
        return <AlertCircle size={18} className="text-yellow-500" />
      case 'task':
        return <CheckCircle size={18} className="text-green-500" />
      default:
        return <Info size={18} className="text-gray-500" />
    }
  }

  const getPriorityColor = () => {
    switch (notificationData.priority) {
      case 'urgent':
        return 'border-l-4 border-red-500'
      case 'high':
        return 'border-l-4 border-orange-500'
      case 'normal':
        return 'border-l-4 border-blue-500'
      default:
        return 'border-l-4 border-gray-300'
    }
  }

  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead(notification.notification_id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`p-4 hover:bg-gradient-to-r hover:from-[#2d1b4e]/5 hover:to-[#1a0f2e]/5 cursor-pointer transition-all duration-200 ${
        !isRead ? 'bg-white' : 'bg-gray-50/50'
      } ${getPriorityColor()}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 mt-1 p-2 rounded-lg ${
          !isRead ? 'bg-[#2d1b4e]/10' : 'bg-gray-100'
        }`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium text-gray-900 ${!isRead ? 'font-semibold' : ''}`}>
              {notificationData.title}
            </h4>
            {!isRead && (
              <span className="flex-shrink-0 w-2.5 h-2.5 bg-gradient-to-r from-[#2d1b4e] to-[#1a0f2e] rounded-full mt-1 shadow-sm"></span>
            )}
          </div>

          <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
            {notificationData.message}
          </p>

          {/* Meeting Link */}
          {notificationData.meeting_link && (
            <a
              href={notificationData.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-white bg-gradient-to-r from-[#2d1b4e] to-[#1a0f2e] hover:from-[#3d2b5e] hover:to-[#2a1f3e] px-3 py-1.5 rounded-lg mt-2 font-medium transition-all shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar size={12} />
              Join Meeting
            </a>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2.5 text-xs text-gray-500">
            <span className="font-medium">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
            {notificationData.creator && (
              <>
                <span>•</span>
                <span className="text-gray-600">by {notificationData.creator.name}</span>
              </>
            )}
            {notificationData.priority === 'urgent' && (
              <>
                <span>•</span>
                <span className="text-red-600 font-semibold">URGENT</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
