import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const remoteImagePatterns = [];
if (process.env.NEXT_PUBLIC_CACHE_USER_AVATARS === "true") {
  remoteImagePatterns.push({
    hostname: "*.googleusercontent.com",
  });
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: remoteImagePatterns,
  },
  async redirects() {
    return [
      {
        source: "/library",
        destination: "/recipes",
        permanent: false,
      },
      {
        source: "/library/recipe/:id",
        destination: "/recipes/:id",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
