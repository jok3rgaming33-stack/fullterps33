"use client"

import { useEffect, useRef } from "react"

/**
 * Orage procédural du hero : éclairs générés aléatoirement (déplacement du point
 * milieu + ramifications) sur <canvas>, flash d'écran et sursaut de lumière sur le
 * personnage (buste encagoulé, sans accessoire). Pause quand l'onglet est masqué,
 * éclairs désactivés si prefers-reduced-motion.
 */

type Pt = { x: number; y: number }
type Bolt = { paths: { pts: Pt[]; w: number }[]; born: number; life: number; seed: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function displace(a: Pt, b: Pt, rough: number, depth: number, out: Pt[]) {
  if (depth === 0) {
    out.push(b)
    return
  }
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const nx = -(b.y - a.y) / (len || 1)
  const ny = (b.x - a.x) / (len || 1)
  const off = (Math.random() - 0.5) * len * rough
  const m = { x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off }
  displace(a, m, rough, depth - 1, out)
  displace(m, b, rough, depth - 1, out)
}

function makePath(a: Pt, b: Pt, depth: number): Pt[] {
  const out: Pt[] = [a]
  displace(a, b, 0.55, depth, out)
  return out
}

function makeBolt(w: number, h: number, now: number): Bolt {
  const start = { x: rand(0.05, 0.95) * w, y: -10 }
  const end = { x: start.x + rand(-0.25, 0.25) * w, y: rand(0.5, 0.95) * h }
  const main = makePath(start, end, 7)
  const paths: Bolt["paths"] = [{ pts: main, w: 1 }]
  const addBranches = (src: Pt[], weight: number, gen: number) => {
    if (gen > 2) return
    for (let i = 4; i < src.length - 4; i++) {
      if (Math.random() > 0.07 / (gen + 1)) continue
      const p = src[i]
      const dir = Math.atan2(src[i + 1].y - p.y, src[i + 1].x - p.x) + rand(-0.9, 0.9)
      const len = rand(0.08, 0.28) * h * weight
      const q = { x: p.x + Math.cos(dir) * len, y: p.y + Math.abs(Math.sin(dir)) * len }
      const br = makePath(p, q, 5)
      paths.push({ pts: br, w: weight * 0.5 })
      addBranches(br, weight * 0.5, gen + 1)
    }
  }
  addBranches(main, 1, 0)
  return { paths, born: now, life: rand(900, 1500), seed: Math.random() }
}

const CHARACTER_POSITION = {
  // Hero : sous le texte en mobile/tablette (espace réservé par le hero), à droite en desktop
  hero: "absolute bottom-0 left-1/2 w-[min(80vw,420px)] -translate-x-1/2 lg:bottom-auto lg:left-auto lg:right-[4%] lg:top-1/2 lg:w-[40vw] lg:max-w-[600px] lg:translate-x-0 lg:-translate-y-1/2",
  // Signup : uniquement en desktop, colonne de droite (le mobile affiche un visuel en tête de carte)
  signup: "absolute right-[5%] top-1/2 hidden w-[38vw] max-w-[560px] -translate-y-1/2 lg:block",
} as const

export function HeroStorm({ variant = "hero" }: { variant?: keyof typeof CHARACTER_POSITION }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const charRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let W = 0
    let H = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = wrap.clientWidth
      H = wrap.clientHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let bolts: Bolt[] = []
    let flash = 0
    let raf = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const applyFlash = (v: number) => {
      if (flashRef.current) flashRef.current.style.opacity = String(v)
      if (charRef.current) {
        charRef.current.style.filter = `drop-shadow(0 0 ${22 + 40 * v}px rgba(${179 + 38 * v},${85 + 90 * v},255,${0.45 + 0.5 * v})) brightness(${1 + 0.55 * v})`
      }
    }

    const frame = (now: number) => {
      ctx.clearRect(0, 0, W, H)
      bolts = bolts.filter((b) => now - b.born < b.life)
      ctx.globalCompositeOperation = "lighter"
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      for (const b of bolts) {
        const t = (now - b.born) / b.life
        // scintillement au début, puis extinction
        const flick = t < 0.35 ? (Math.random() < 0.3 ? 0.25 : 1) : 1
        const a = (t < 0.25 ? 1 : Math.pow(1 - (t - 0.25) / 0.75, 1.4)) * flick
        for (const p of b.paths) {
          ctx.beginPath()
          ctx.moveTo(p.pts[0].x, p.pts[0].y)
          for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i].x, p.pts[i].y)
          ctx.shadowColor = "#EDE4FF"
          ctx.shadowBlur = 28
          ctx.strokeStyle = `rgba(210,180,255,${0.85 * a})`
          ctx.lineWidth = 14 * p.w
          ctx.stroke()
          ctx.shadowBlur = 8
          ctx.shadowColor = "#FFFFFF"
          ctx.strokeStyle = `rgba(255,255,255,${a})`
          ctx.lineWidth = Math.max(1.6, 3.6 * p.w)
          ctx.stroke()
        }
      }
      ctx.shadowBlur = 0
      flash *= 0.88
      if (flash < 0.01) flash = 0
      applyFlash(flash)
      if (bolts.length || flash) raf = requestAnimationFrame(frame)
      else raf = 0
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const strike = () => {
      if (W < 2 || H < 2) resize()
      const now = performance.now()
      const n = Math.random() < 0.45 ? 3 : 2
      for (let i = 0; i < n; i++) bolts.push(makeBolt(W, H, now))
      flash = Math.min(1, flash + rand(0.55, 0.9))
      kick()
      // ré-amorçage fréquent : un second flash très court
      if (Math.random() < 0.45) {
        setTimeout(() => {
          flash = Math.min(1, flash + rand(0.3, 0.6))
          kick()
        }, rand(90, 220))
      }
      schedule()
    }

    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(strike, rand(700, 1800))
    }

    const onVis = () => {
      if (document.hidden) {
        clearTimeout(timer)
        cancelAnimationFrame(raf)
        raf = 0
        bolts = []
        flash = 0
        applyFlash(0)
        ctx.clearRect(0, 0, W, H)
      } else {
        schedule()
      }
    }
    document.addEventListener("visibilitychange", onVis)
    timer = setTimeout(strike, 180)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [])

  return (
    <div ref={wrapRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      {/* Flash d'écran */}
      <div ref={flashRef} className="storm-flash absolute inset-0" />

      {/* Personnage : buste encagoulé, sans accessoire */}
      <div className={CHARACTER_POSITION[variant]}>
        <div className="storm-halo absolute inset-[12%] rounded-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={charRef}
          src="/images/hero-character.svg"
          alt=""
          width={660}
          height={660}
          className="storm-character relative h-auto w-full select-none"
          draggable={false}
        />
      </div>

      {variant === "hero" && (
        <>
          <svg viewBox="0 0 46 64" className="hero-bolt pointer-events-none absolute left-[18%] top-[8%] w-10 sm:w-14" aria-hidden="true">
            <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#F4F0FF" stroke="#B355FF" strokeWidth="1" />
          </svg>
          <svg viewBox="0 0 46 64" className="hero-bolt hero-bolt-b pointer-events-none absolute right-[22%] top-[6%] w-8 sm:w-12" aria-hidden="true">
            <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#FFFFFF" stroke="#D9AFFF" strokeWidth="1" />
          </svg>
          <svg viewBox="0 0 46 64" className="hero-bolt hero-bolt-c pointer-events-none absolute left-[42%] top-[18%] w-7 sm:left-[36%] sm:w-11" aria-hidden="true">
            <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#E7D6FF" stroke="#FFFFFF" strokeWidth="1" />
          </svg>
        </>
      )}

      {/* Éclairs procéduraux */}
      <canvas ref={canvasRef} className="absolute inset-0 z-[2] h-full w-full" />
    </div>
  )
}
