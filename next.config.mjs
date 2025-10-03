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
  serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  experimental: {
    outputFileTracingIncludes: {
      "app/api/generate-pdf/route.ts": [
        "./node_modules/@sparticuz/chromium/bin/**",
      ],
    },
  },
};

export default nextConfig;
