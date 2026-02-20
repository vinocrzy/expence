import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

import packageJson from "./package.json";
const withSerwist = withSerwistInit({
  // Note: This is only an example.
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withSerwist(nextConfig);
