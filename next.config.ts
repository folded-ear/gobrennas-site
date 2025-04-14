import type { NextConfig } from "next";
const glob = require("glob");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@adobe/react-spectrum",
    "@react-spectrum/*",
    "@spectrum-icons/*",
  ].flatMap((spec) => glob.sync(`${spec}`, { cwd: "node_modules/" })),
};

export default nextConfig;
