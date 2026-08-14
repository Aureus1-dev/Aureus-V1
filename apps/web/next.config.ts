import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained production server bundle (PR-002) — the Docker runtime
  // image copies only .next/standalone + .next/static instead of the full
  // node_modules tree.
  output: 'standalone',
  // Security headers (PD-001) — the API already sends these via helmet(),
  // but they only protect API JSON responses. The browser only enforces
  // clickjacking/MIME-sniffing/referrer protections on the page it's
  // actually rendering, which is served by this app, not the API.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        ],
      },
      {
        // PF-006's dedicated embed surface is the only page that may be
        // framed. Every private/member/public non-embed route stays closed.
        source: '/((?!embed/ward(?:/|$)).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: '/embed/ward/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ];
  },
};

export default nextConfig;
