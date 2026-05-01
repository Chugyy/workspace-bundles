import type { NextConfig } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  serverExternalPackages: ['@blocknote/core', '@blocknote/react', '@blocknote/mantine'],
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: `${API_URL}/api/:path*`,
    },
  ],
}

export default nextConfig
