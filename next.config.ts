import type { NextConfig } from 'next';

const indexable = process.env.SITE_INDEXABLE === 'true';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['dotted-map'],
  async headers() {
    if (indexable) return [];
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
