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
    const whatCoffeeRewrites = [
      {
        source: "/what-coffee",
        destination: "https://what-coffee-xi.vercel.app/what-coffee",
      },
      {
        source: "/what-coffee/:path*",
        destination: "https://what-coffee-xi.vercel.app/what-coffee/:path*",
      },
    ];
    if (!backendUrl) return whatCoffeeRewrites;
    return [
      ...whatCoffeeRewrites,
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
