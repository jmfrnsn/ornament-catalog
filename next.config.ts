import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.metmuseum.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.artic.edu",
        pathname: "/iiif/**",
      },
      {
        protocol: "https",
        hostname: "openaccess-cdn.clevelandart.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
