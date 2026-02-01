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
if (process.env.AWS_S3_BUCKET_NAME) {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket.includes(".")) {
    // vhost style
    remoteImagePatterns.push({
      hostname: `${bucket}.s3.us-west-2.amazonaws.com`,
    });
  } else {
    // have to use path style
    remoteImagePatterns.push({
      hostname: "s3.us-west-2.amazonaws.com",
      pathname: `/${bucket}/**`,
    });
  }
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
