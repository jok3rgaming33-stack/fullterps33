"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { BlobMedia } from "@/components/blob-media"
import { ProductBadges } from "@/components/product-badges"
import { ProductModal } from "@/components/product-modal"
import type { Product } from "@/lib/types"
import { formatPrice } from "@/lib/utils"

function priceLabel(product: Product): string {
  if (product.status === "rupture") return "Rupture"
  if (product.status === "bientot") return "Bientôt"
  const prices = (product.variants ?? []).map((v) => v.price).filter((n) => n > 0)
  const min = prices.length ? Math.min(...prices) : product.price
  const label = formatPrice(min)
  return prices.length > 1 ? `dès ${label}` : label
}

function coverOf(product: Product) {
  return product.image || product.media?.[0] || null
}

function computeLayout(width: number) {
  const cardW = Math.round(Math.min(220, Math.max(136, width * 0.46)))
  const spread = Math.min(cardW * 0.78, Math.max(72, (width - cardW) / 2 - 12))
  const stageH = cardW + 132
  return { cardW, spread, stageH }
}

/** Projection 2D : pas de preserve-3d, qui s'aplatit et coupe les cartes sur mobile. */
function place(index: number, rotation: number, n: number, spread: number) {
  const step = 360 / n
  let ang = index * step + rotation
  ang = ((ang % 360) + 360) % 360
  if (ang > 180) ang -= 360
  const rad = (ang * Math.PI) / 180
  const depth = Math.cos(rad)
  const hidden = Math.abs(ang) > 108
  return {
    x: Math.sin(rad) * spread,
    scale: 0.8 + 0.2 * Math.max(0, depth),
    opacity: hidden ? 0 : 0.55 + 0.45 * Math.max(0, depth),
    zIndex: Math.round(100 + depth * 40),
    hidden,
    front: Math.abs(ang) < step / 2,
  }
}

export function ProductOrbitCarousel({ products }: { products: Product[] }) {
  const n = products.length
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [active, setActive] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [inView, setInView] = useState(true)
  const [layout, setLayout] = useState({ cardW: 168, spread: 110, stageH: 276 })
  const [opened, setOpened] = useState<Product | null>(null)

  const dragRef = useRef<{
    x: number
    y: number
    rot: number
    axis: "h" | "v" | null
    moved: boolean
  } | null>(null)
  const suppressClickRef = useRef(false)
  const rotRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const lastTs = useRef<number | null>(null)

  useEffect(() => { rotRef.current = rotation }, [rotation])

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const sync = () => setLayout(computeLayout(el.clientWidth || window.innerWidth))
    sync()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null
    ro?.observe(el)
    window.addEventListener("resize", sync)
    return () => {
      ro?.disconnect()
      window.removeEventListener("resize", sync)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    if (mq.matches) setPlaying(false)
    const onChange = () => {
      setReducedMotion(mq.matches)
      if (mq.matches) setPlaying(false)
    }
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin: "40px", threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const step = n > 0 ? 360 / n : 0

  const snapTo = useCallback((index: number) => {
    if (n < 1) return
    const i = ((index % n) + n) % n
    const target = -i * step
    const curNorm = ((rotRef.current % 360) + 360) % 360
    let delta = target - curNorm
    delta = ((((delta + 180) % 360) + 360) % 360) - 180
    const next = rotRef.current + delta
    rotRef.current = next
    setRotation(next)
    setActive(i)
  }, [n, step])

  useEffect(() => {
    if (reducedMotion || n < 2 || !playing || !inView || opened) return
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts
      const dt = Math.min(0.05, (ts - lastTs.current) / 1000)
      lastTs.current = ts
      if (!dragRef.current) {
        const next = rotRef.current - 18 * dt
        rotRef.current = next
        setRotation(next)
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      lastTs.current = null
    }
  }, [n, reducedMotion, playing, inView, opened])

  useEffect(() => {
    if (n < 1 || step === 0) return
    const norm = (((-rotation) % 360) + 360) % 360
    const idx = Math.round(norm / step) % n
    setActive((cur) => (cur === idx ? cur : idx))
  }, [rotation, n, step])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (n < 2) return
    suppressClickRef.current = false
    dragRef.current = { x: e.clientX, y: e.clientY, rot: rotRef.current, axis: null, moved: false }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      d.axis = Math.abs(dx) >= Math.abs(dy) ? "h" : "v"
      if (d.axis === "v") {
        dragRef.current = null
        setDragging(false)
        return
      }
      setDragging(true)
      setPlaying(false)
      try { stageRef.current?.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    if (d.axis !== "h") return
    if (Math.abs(dx) > 4) d.moved = true
    e.preventDefault()
    const next = d.rot + dx * 0.45
    rotRef.current = next
    setRotation(next)
  }

  const endDrag = (e?: ReactPointerEvent) => {
    if (!dragRef.current) return
    const wasH = dragRef.current.axis === "h"
    const moved = dragRef.current.moved
    dragRef.current = null
    setDragging(false)
    if (e) {
      try { stageRef.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    if (wasH && moved && n > 0) {
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 280)
      const norm = (((-rotRef.current) % 360) + 360) % 360
      const idx = Math.round(norm / step) % n
      snapTo(idx)
    }
  }

  const go = (dir: -1 | 1) => {
    if (n < 2) return
    setPlaying(false)
    snapTo(active + dir)
  }

  if (n === 0) return null

  const current = products[active] ?? products[0]
  const { cardW, spread, stageH } = layout
  const ease = dragging || playing ? "none" : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease"

  return (
    <div ref={rootRef} className="relative w-full select-none">
      {n === 1 ? (
        <div className={opened ? "invisible" : undefined}>
          <Face product={products[0]} width={Math.min(240, cardW + 24)} front className="mx-auto" onOpen={() => setOpened(products[0])} />
        </div>
      ) : (
        <div
          ref={stageRef}
          className={`relative mx-auto w-full touch-pan-y ${opened ? "invisible" : ""}`}
          style={{ height: stageH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="region"
          aria-roledescription="carousel"
          aria-label="Carousel produits"
        >
          {products.map((product, i) => {
            const spot = place(i, rotation, n, spread)
            return (
              <button
                key={product.id}
                type="button"
                aria-hidden={spot.hidden}
                aria-label={product.name}
                disabled={spot.hidden}
                onClick={(e) => {
                  e.stopPropagation()
                  if (suppressClickRef.current || spot.hidden) return
                  if (spot.front) setOpened(product)
                  else { setPlaying(false); snapTo(i) }
                }}
                className="absolute left-1/2 top-1/2 text-left"
                style={{
                  width: cardW,
                  zIndex: spot.zIndex,
                  opacity: spot.opacity,
                  pointerEvents: spot.hidden ? "none" : "auto",
                  transform: `translate(-50%, -50%) translateX(${spot.x}px) scale(${spot.scale})`,
                  transition: ease,
                }}
              >
                <Face product={product} width={cardW} front={spot.front} />
              </button>
            )
          })}
        </div>
      )}

      {n > 1 && (
        <div className="mt-2 flex flex-col items-center gap-3">
          <p className="px-2 text-center font-mono text-xs text-ivory/50">
            <span className="font-display text-base tracking-wide text-ivory">{current?.name}</span>
            {current ? <span> · {priceLabel(current)}</span> : null}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ivory hover:border-violet-electric/50" aria-label="Produit précédent">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              disabled={reducedMotion}
              className="flex h-10 min-w-[6.5rem] items-center justify-center gap-1.5 rounded-full border border-violet-electric/40 bg-violet-electric/15 px-3 font-mono text-[10px] font-bold uppercase tracking-widest text-violet-electric hover:bg-violet-electric/25 disabled:opacity-40"
              aria-label={playing ? "Pause" : "Lecture"}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? "Pause" : "Lecture"}
            </button>
            <button type="button" onClick={() => go(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ivory hover:border-violet-electric/50" aria-label="Produit suivant">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="flex max-w-full flex-wrap justify-center gap-1.5" role="tablist">
            {products.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={p.name}
                onClick={() => { setPlaying(false); snapTo(i) }}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-violet-electric" : "w-1.5 bg-white/25 hover:bg-white/40"}`}
              />
            ))}
          </div>
          <p className="px-2 text-center font-mono text-[10px] text-ivory/35">
            Glisse, ou clique la carte de face pour ouvrir
          </p>
        </div>
      )}

      {opened && <ProductModal product={opened} isOpen onClose={() => setOpened(null)} />}
    </div>
  )
}

function Face({
  product,
  front,
  width,
  className = "",
  onOpen,
}: {
  product: Product
  front: boolean
  width: number
  className?: string
  onOpen?: () => void
}) {
  const cover = coverOf(product)
  const body = (
    <>
      <div className="relative">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-surface sm:rounded-2xl">
          {cover ? (
            <BlobMedia src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-violet-electric/30">
              <svg viewBox="0 0 100 100" className="h-12 w-12">
                <path d="M35 15 L50 8 L65 15 L78 25 L70 35 L65 30 L65 90 L35 90 L35 30 L30 35 L22 25 Z" fill="currentColor" />
              </svg>
            </div>
          )}
        </div>
        <ProductBadges product={product} compact />
      </div>
      <div className="mt-1.5 min-w-0 px-0.5 pb-0.5">
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-violet-electric sm:text-[10px]">
          {priceLabel(product)}
        </p>
        <h3 className="line-clamp-2 font-display text-sm leading-tight tracking-wide text-ivory sm:text-base">
          {product.name}
        </h3>
      </div>
    </>
  )
  const shell = `flex w-full flex-col overflow-visible rounded-2xl border bg-void/95 p-2 text-left shadow-xl sm:rounded-3xl sm:p-2.5 ${className} ${
    front
      ? "border-violet-electric/70 shadow-[0_0_32px_rgba(179,85,255,0.4)]"
      : "border-white/15"
  }`

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={shell} style={{ width }}>
        {body}
      </button>
    )
  }
  return <div className={shell} style={{ width }}>{body}</div>
}
