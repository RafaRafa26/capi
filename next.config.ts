import type { NextConfig } from "next";

import { POSTHOG_ASSETS_HOST, POSTHOG_INGEST_HOST, POSTHOG_PROXY_PATH } from "./src/lib/analytics/config";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Os .ttf dos PDFs são lidos do disco (src/lib/pdf-fonts.ts), então o
  // rastreio de arquivos do build não os acha sozinho.
  outputFileTracingIncludes: {
    "/o/*/reports/**": ["./src/assets/fonts/**/*"],
  },
  // PostHog through our own domain (see src/lib/analytics/config.ts), so ad
  // blockers don't drop the events. Its API paths end in a slash.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: `${POSTHOG_PROXY_PATH}/static/:path*`, destination: `${POSTHOG_ASSETS_HOST}/static/:path*` },
      { source: `${POSTHOG_PROXY_PATH}/array/:path*`, destination: `${POSTHOG_ASSETS_HOST}/array/:path*` },
      { source: `${POSTHOG_PROXY_PATH}/:path*`, destination: `${POSTHOG_INGEST_HOST}/:path*` },
    ];
  },
};

export default nextConfig;
