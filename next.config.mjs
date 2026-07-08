/** @type {import('next').NextConfig} */
const nextConfig = {
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
