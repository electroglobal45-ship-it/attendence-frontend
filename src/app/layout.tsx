import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { MeetingsProvider } from '@/lib/meetings-context'
import ActiveMeetingWidget from '@/components/meetings/ActiveMeetingWidget'
import NextTopLoader from 'nextjs-toploader'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

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
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans antialiased bg-white text-text-primary">
        <NextTopLoader color="#2563eb" showSpinner={false} />
        <AuthProvider>
          <MeetingsProvider>
            {children}
            <ActiveMeetingWidget />
          </MeetingsProvider>
        </AuthProvider>
        <Script src="/external_api.js" strategy="beforeInteractive" />
      </body>
    </html>
  )
}

