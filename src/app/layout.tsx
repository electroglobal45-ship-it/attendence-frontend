import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import NextTopLoader from 'nextjs-toploader'

export const metadata: Metadata = {
  title: 'CRM Attendance',
  description: 'Employee Attendance & Leave Management Platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CRM Attendance',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NextTopLoader color="#2563eb" showSpinner={false} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
