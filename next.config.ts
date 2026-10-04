import { loadEnvConfig } from "@next/env";
import { withSerwist } from "@serwist/turbopack";
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

// A build's id is when it was built, in ms since the epoch: a snapshot can
// tell it's from another build, and the profile page says when this one was.
const buildId = String(Date.now());

const nextConfig: NextConfig = {
  output: "standalone",
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
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
      {
        source: "/plan",
        destination: "/planner",
        permanent: false,
      },
      {
        source: "/plan/:id",
        destination: "/planner/:id",
        permanent: false,
      },
    ];
  },
};

export default withSerwist(nextConfig);
