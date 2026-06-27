/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification (faster builds)
  swcMinify: true,
  
  // Strict mode for better performance
  reactStrictMode: true,
  
  // Optimize package imports and performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    // Enable optimized route prefetching
    optimisticClientCache: true,
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production (keep error + warn for monitoring)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  images: {
    domains: ['lxshgillxjohtideuugq.supabase.co', 'coqpvdpkrthiwessgurq.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Force fresh builds - prevents caching issues
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  // Ensure proper handling of environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // ============================================================
  // HTTP Security Headers
  // Applied to every route in the application.
  // ============================================================
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'

    // Build the Content-Security-Policy string.
    // 'unsafe-eval' + 'unsafe-inline' on script-src are required by Next.js itself.
    // In dev we also need to allow next-dev-overlay WebSocket connections.
    const connectSrc = isDev
      ? "'self' http://localhost:5000 https://attendence-backend-k951.onrender.com wss://attendence-backend-k951.onrender.com https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:*"
      : "'self' https://attendence-backend-k951.onrender.com wss://attendence-backend-k951.onrender.com https://*.supabase.co wss://*.supabase.co"

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://meet.jit.si https://*.jit.si https://*.daily.co https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.daily.co",
      "font-src 'self' https://fonts.gstatic.com https://*.daily.co",
      "img-src 'self' data: blob: https://lxshgillxjohtideuugq.supabase.co https://coqpvdpkrthiwessgurq.supabase.co https://*.daily.co",
      `connect-src ${connectSrc} https://*.daily.co wss://*.daily.co https://api.daily.co`,
      "media-src 'self' blob: mediastream: https://*.daily.co",
      "worker-src 'self' blob:",
      "frame-src 'self' https://meet.jit.si https://*.jit.si https://*.daily.co",
      "frame-ancestors 'none'",   // replaces X-Frame-Options — stronger
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          // Block your app from being embedded in an iframe (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },

          // Stop browsers from MIME-sniffing responses away from the declared content-type
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // Force HTTPS for 1 year (production only — browser will cache this)
          ...(isDev ? [] : [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          }]),

          // Limit which browser features this origin can use
          // camera/mic allowed for self and Jitsi — geolocation allowed (needed for attendance check-in)
          // Allow camera/mic/display-capture for our origin AND Daily.co iframes (nested iframe permissions)
          { key: 'Permissions-Policy', value: 'camera=*, microphone=*, display-capture=*, fullscreen=*, geolocation=(self)' },

          // Don't send the full Referer URL to third-party domains
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // Content Security Policy
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

module.exports = nextConfig

