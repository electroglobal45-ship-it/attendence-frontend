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
    // Remove console logs in production
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
}

module.exports = nextConfig
