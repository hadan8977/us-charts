import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vela ships ESM; ensure Next transpiles the package for the App Router client bundle.
  transpilePackages: ["@luxalgo/vela"],
};

export default nextConfig;
