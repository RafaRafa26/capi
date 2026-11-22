import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Os .ttf dos PDFs são lidos do disco (src/lib/pdf-fonts.ts), então o
  // rastreio de arquivos do build não os acha sozinho.
  outputFileTracingIncludes: {
    "/o/*/reports/**": ["./src/assets/fonts/**/*"],
  },
};

export default nextConfig;
