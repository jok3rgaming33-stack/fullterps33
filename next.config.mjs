// v0: touched to force dev server restart — 2026-07-08
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autorise l'intégration en iframe uniquement depuis le même site
  // (« Vue client » du panel admin) et l'interdit aux sites tiers.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Augmente la limite de body pour les uploads de vidéos (500 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
}

export default nextConfig
