import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@mantine/charts'],
  },

  // Optimize CSS handling
  transpilePackages: ['@mantine/core', '@mantine/hooks'],
};

export default nextConfig;
