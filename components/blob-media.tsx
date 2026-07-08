"use client"

import { type VideoHTMLAttributes, type ImgHTMLAttributes } from "react"

/**
 * Convertit une URL Vercel Blob privée en URL proxy (/api/media?url=...).
 * Les URLs non-Blob sont retournées telles quelles.
 */
export function toProxyUrl(url: string | null | undefined): string {
  if (!url) return ""
  if (url.includes(".blob.vercel-storage.com")) {
    return `/api/media?url=${encodeURIComponent(url)}`
  }
  return url
}

export function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|quicktime)(\?|$)/i.test(url)
}

type BlobImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined
}

/** <img> avec passage automatique par le proxy pour les fichiers Blob privés */
export function BlobImg({ src, alt = "", ...props }: BlobImgProps) {
  if (!src) return null
  return <img src={toProxyUrl(src)} alt={alt} {...props} />
}

type BlobVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string | null | undefined
}

/** <video> avec passage automatique par le proxy pour les fichiers Blob privés */
export function BlobVideo({ src, ...props }: BlobVideoProps) {
  if (!src) return null
  return <video src={toProxyUrl(src)} {...props} />
}

/**
 * Composant universel image OU vidéo selon l'extension.
 * Passe automatiquement par le proxy Blob privé.
 */
export function BlobMedia({
  src,
  alt = "",
  className,
  videoProps,
}: {
  src: string | null | undefined
  alt?: string
  className?: string
  videoProps?: Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "className">
}) {
  if (!src) return null
  const proxied = toProxyUrl(src)
  if (isVideoUrl(src)) {
    return (
      <video
        src={proxied}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        {...videoProps}
      />
    )
  }
  return <img src={proxied} alt={alt} className={className} />
}
