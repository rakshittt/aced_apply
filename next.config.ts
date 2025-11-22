import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent bundling pdf-parse to avoid worker initialization issues
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
