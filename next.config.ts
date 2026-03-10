import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack (default in Next.js 16) – silence the missing-canvas warning for pdfjs-dist
  turbopack: {},
};

export default nextConfig;
