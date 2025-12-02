/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static optimization for dashboard pages that need runtime
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
