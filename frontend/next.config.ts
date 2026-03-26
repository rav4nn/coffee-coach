import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    return [
      {
        source: "/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
      {
        source: "/api/static/:path*",
        destination: `${backendUrl}/api/static/:path*`,
      },
    ];
  },
};

export default nextConfig;
