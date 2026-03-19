import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3.devnguyen.me",
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {},
};

export default nextConfig;
