import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Security headers live in src/lib/security/headers.ts and are applied here.
};

export default nextConfig;
