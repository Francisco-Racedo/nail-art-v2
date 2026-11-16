import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.131', 'localhost'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
