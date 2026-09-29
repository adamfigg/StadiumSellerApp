import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Want posts can include a card photo.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
