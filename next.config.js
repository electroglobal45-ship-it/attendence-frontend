/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lxshgillxjohtideuugq.supabase.co', 'coqpvdpkrthiwessgurq.supabase.co'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
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
}

module.exports = nextConfig
