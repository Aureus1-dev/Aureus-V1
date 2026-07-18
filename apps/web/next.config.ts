import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained production server bundle (PR-002) — the Docker runtime
  // image copies only .next/standalone + .next/static instead of the full
  // node_modules tree.
  output: 'standalone',
};

export default nextConfig;
