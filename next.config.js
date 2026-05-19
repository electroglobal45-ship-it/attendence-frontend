/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['coqpvdpkrthiwessgurq.supabase.co'],
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
}

module.exports = nextConfig
