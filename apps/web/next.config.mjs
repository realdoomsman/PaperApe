/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@paperape/shared'],
  reactStrictMode: true,

  // Compress responses with gzip/brotli
  compress: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.dexscreener.com' },
      { protocol: 'https', hostname: '**.arweave.net' },
      { protocol: 'https', hostname: '**.ipfs.io' },
      { protocol: 'https', hostname: '**.cloudflare-ipfs.com' },
      { protocol: 'https', hostname: '**.nftstorage.link' },
    ],
  },

  // Enable experimental features for performance
  experimental: {
    scrollRestoration: true,
  },

  // Custom headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
