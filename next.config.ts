import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
