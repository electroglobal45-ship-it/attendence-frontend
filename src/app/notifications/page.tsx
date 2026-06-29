'use client'

import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Plus } from 'lucide-react'
import CreateNotificationModal from '@/components/notifications/CreateNotificationModal'
import { useAuth } from '@/lib/auth-context'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Only admin and team leader can create notifications
  const canCreateNotifications = user?.role === 'admin' || user?.role === 'team leader'

  return (
    <>
      <PageWrapper
        title="Notifications"
        subtitle="Manage and view all notifications"
        actions={
          canCreateNotifications && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Notification</span>
            </button>
          )
        }
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-600">
            Notifications feature is active. Use the bell icon in the header to view your notifications.
          </p>
          {canCreateNotifications && (
            <p className="text-gray-600 mt-2">
              As an {user?.role}, you can create notifications and assign them to team members.
            </p>
          )}
        </div>
      </PageWrapper>

      <CreateNotificationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  )
}
