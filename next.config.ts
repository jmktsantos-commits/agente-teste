import type { NextConfig } from "next";

const nextConfig: any = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  }
};

export default nextConfig;
