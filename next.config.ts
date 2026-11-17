import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.131', 'localhost'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
