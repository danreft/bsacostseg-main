import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Five optional documents at 5 MiB each, plus multipart/form data overhead.
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
};

export default nextConfig;
