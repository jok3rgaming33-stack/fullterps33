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
import { ProductModal } from "@/components/product-modal"
import { getBadge } from "@/lib/badges"
import { badgeStyles, type Product } from "@/lib/types"
import { formatPrice } from "@/lib/utils"

function priceLabel(product: Product): string {
  if (product.status === "rupture") return "Rupture"
  if (product.status === "bientot") return "Bientôt"
  const prices = (product.variants ?? []).map((v) => v.price).filter((n) => n > 0)
  const min = prices.length ? Math.min(...prices) : product.price
  const label = formatPrice(min)
  return prices.length > 1 ? `dès ${label}` : label
}

function computeLayout(width: number, n: number) {
  const cardW =
    width < 380 ? 148 : width < 480 ? 164 : width < 768 ? 184 : width < 1024 ? 204 : 220
  const angle = Math.PI / Math.max(n, 3)
  const minR = (cardW * 0.64) / Math.tan(angle)
  const rFromWidth = width * (width < 480 ? 0.38 : width < 768 ? 0.36 : 0.32)
  const radius = Math.round(Math.min(Math.max(minR, rFromWidth, 148), 400))
  const stageH = Math.round(
    Math.min(560, Math.max(320, cardW * 1.58 + (width < 480 ? 78 : 120))),
  )
  return { cardW, radius, stageH }
}

function coverOf(product: Product) {
  return product.image || product.media?.[0] || null
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
  const [layout, setLayout] = useState({ cardW: 164, radius: 220, stageH: 380 })
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
  const playingRef = useRef(playing)
  const inViewRef = useRef(inView)
  const frameRef = useRef<number | null>(null)
  const lastTs = useRef<number | null>(null)

  useEffect(() => { rotRef.current = rotation }, [rotation])
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { inViewRef.current = inView }, [inView])

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const sync = () => {
      const w = el.clientWidth || window.innerWidth
      setLayout(computeLayout(w, Math.max(n, 1)))
    }
    sync()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null
    ro?.observe(el)
    window.addEventListener("resize", sync)
    return () => {
      ro?.disconnect()
      window.removeEventListener("resize", sync)
    }
  }, [n])

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
      ([entry]) => setInView(!!entry?.isIntersecting),
      { rootMargin: "80px", threshold: 0.12 },
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
    if (reducedMotion || n < 2) return
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts
      const dt = Math.min(0.05, (ts - lastTs.current) / 1000)
      lastTs.current = ts
      if (playingRef.current && inViewRef.current && !dragRef.current) {
        const next = rotRef.current + 10 * dt
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
  }, [n, reducedMotion])

  useEffect(() => {
    if (n < 1) return
    const norm = ((rotation % 360) + 360) % 360
    const idx = Math.round((-norm / step + n * 20) % n) % n
    setActive(idx)
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
    const next = d.rot + dx * 0.42
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
    if (wasH && moved) {
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 280)
      if (n > 0) {
        const norm = ((rotRef.current % 360) + 360) % 360
        const idx = Math.round((-norm / step + n * 20) % n) % n
        snapTo(idx)
      }
    }
  }

  const go = (dir: -1 | 1) => {
    if (n < 2) return
    setPlaying(false)
    snapTo(active + dir)
  }

  const openActive = () => {
    if (suppressClickRef.current) return
    const product = products[active]
    if (product) setOpened(product)
  }

  if (n === 0) return null

  const current = products[active] ?? products[0]
  const { cardW, radius, stageH } = layout

  return (
    <div ref={rootRef} className="relative w-full select-none">
      {n === 1 ? (
        <OrbitFace
          product={products[0]}
          front
          width={Math.min(240, cardW + 40)}
          className="mx-auto"
          onOpen={() => setOpened(products[0])}
        />
      ) : (
        <div
          className="relative mx-auto w-full overflow-hidden"
          style={{ height: stageH, clipPath: "inset(0)", WebkitClipPath: "inset(0)", isolation: "isolate", contain: "paint" }}
        >
          <div
            ref={stageRef}
            className="absolute inset-0 touch-pan-y"
            style={{ perspective: "900px", perspectiveOrigin: "50% 45%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            role="region"
            aria-roledescription="carousel"
            aria-label="Carousel produits"
          >
            <div aria-hidden className="pointer-events-none absolute inset-x-[12%] bottom-[6%] h-16 rounded-[100%] bg-violet-electric/20 blur-2xl sm:h-24 sm:blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-[40%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-electric/15 blur-3xl" />
            <div
              className="absolute inset-0"
              style={{
                transformStyle: "preserve-3d",
                transform: `translateZ(-${Math.round(radius * 0.08)}px) rotateX(3deg) rotateY(${rotation}deg)`,
                transition: dragging || playing ? "none" : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {products.map((product, i) => {
                const angle = i * step
                return (
                  <div
                    key={product.id}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      width: cardW,
                      transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                      transformStyle: "preserve-3d",
                      zIndex: i === active ? 5 : 1,
                      pointerEvents: "none",
                      backfaceVisibility: "hidden",
                    }}
                    aria-hidden
                  >
                    <OrbitFace product={product} front={i === active} width={cardW} />
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-[46%] cursor-pointer rounded-3xl bg-transparent"
              style={{ width: cardW, height: Math.round(cardW * 1.38) }}
              aria-label={current ? `Ouvrir ${current.name}` : "Ouvrir le produit"}
              onClick={(e) => { e.stopPropagation(); openActive() }}
            />
          </div>
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

      {opened && (
        <ProductModal product={opened} isOpen onClose={() => setOpened(null)} />
      )}
    </div>
  )
}

function OrbitFace({
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
  const out = product.status === "rupture" || product.status === "bientot"
  const cover = coverOf(product)
  const badgeKey = product.badges?.[0]
  const badge = badgeKey ? getBadge(badgeKey) : null
  const Tag = onOpen ? "button" : "div"

  return (
    <Tag
      type={onOpen ? "button" : undefined}
      onClick={onOpen}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-void/95 p-2 text-left shadow-xl backdrop-blur-md transition-[box-shadow,border-color,opacity] duration-300 sm:rounded-3xl sm:p-2.5 ${className} ${
        out
          ? "border-white/10 opacity-50"
          : front
            ? "border-violet-electric/70 opacity-100 shadow-[0_0_36px_rgba(179,85,255,0.45)]"
            : "border-white/10 opacity-75"
      }`}
      style={{ width, backfaceVisibility: "hidden" }}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface sm:rounded-2xl">
        {cover ? (
          <BlobMedia src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-violet-electric/30">
            <svg viewBox="0 0 100 100" className="h-12 w-12">
              <path d="M35 15 L50 8 L65 15 L78 25 L70 35 L65 30 L65 90 L35 90 L35 30 L30 35 L22 25 Z" fill="currentColor" />
            </svg>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-void to-transparent" />
        {badge ? (
          <span className={`absolute right-1.5 top-1.5 rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide ${badge.color} ${badge.text} ${badge.border}`}>
            {badge.label}
          </span>
        ) : product.badge ? (
          <span className={`clip-tag absolute right-1.5 top-1.5 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${badgeStyles[product.badge] ?? "bg-white/10 text-ivory"}`}>
            {product.badge}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 min-w-0 px-0.5 pb-0.5">
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-violet-electric sm:text-[10px]">
          {priceLabel(product)}
        </p>
        <h3 className="line-clamp-2 font-display text-sm leading-tight tracking-wide text-ivory sm:text-base">
          {product.name}
        </h3>
      </div>
    </Tag>
  )
}
