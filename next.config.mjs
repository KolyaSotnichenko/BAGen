/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {
    outputFileTracingIncludes: {
      "app/api/generate-pdf/route.ts": [
        "node_modules/@sparticuz/chromium/bin/**"
      ],
    },
  },
};

export default nextConfig;
