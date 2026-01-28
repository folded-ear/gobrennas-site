import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
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
