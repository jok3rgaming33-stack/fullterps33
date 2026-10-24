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
  displace(a, b, 0.45, depth, out)
  return out
}

function makeBolt(w: number, h: number, now: number): Bolt {
  const start = { x: rand(0.12, 0.88) * w, y: -8 }
  const end = { x: start.x + rand(-0.18, 0.18) * w, y: rand(0.45, 0.82) * h }
  const main = makePath(start, end, 4)
  const paths: Bolt["paths"] = [{ pts: main, w: 1 }]
  // Une seule ramification légère : le flou d'ombre et les arbres profonds figeaient le défilement.
  if (main.length > 6 && Math.random() < 0.55) {
    const i = 2 + Math.floor(Math.random() * (main.length - 4))
    const p = main[i]
    const dir = Math.atan2(main[i + 1].y - p.y, main[i + 1].x - p.x) + rand(-0.7, 0.7)
    const len = rand(0.06, 0.16) * h
    const q = { x: p.x + Math.cos(dir) * len, y: p.y + Math.abs(Math.sin(dir)) * len }
    paths.push({ pts: makePath(p, q, 3), w: 0.45 })
  }
  return { paths, born: now, life: rand(520, 780), seed: Math.random() }
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
      // DPR 1 : un canvas rétina plein écran avec ombre floue saturait le mobile.
      W = wrap.clientWidth
      H = wrap.clientHeight
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = Math.max(1, Math.round(W))
        canvas.height = Math.max(1, Math.round(H))
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let bolts: Bolt[] = []
    let flash = 0
    let raf = 0
    let onScreen = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const applyFlash = (v: number) => {
      if (flashRef.current) flashRef.current.style.opacity = v < 0.04 ? "0" : v.toFixed(2)
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
        const a = t < 0.2 ? 1 : Math.pow(1 - (t - 0.2) / 0.8, 1.6)
        for (const p of b.paths) {
          ctx.beginPath()
          ctx.moveTo(p.pts[0].x, p.pts[0].y)
          for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i].x, p.pts[i].y)
          // Halo peint en trait large : pas de shadowBlur, qui saturait le mobile.
          ctx.strokeStyle = `rgba(186,140,255,${0.42 * a})`
          ctx.lineWidth = 15 * p.w
          ctx.stroke()
          ctx.strokeStyle = `rgba(230,210,255,${0.9 * a})`
          ctx.lineWidth = 6 * p.w
          ctx.stroke()
          ctx.strokeStyle = `rgba(255,255,255,${a})`
          ctx.lineWidth = Math.max(1.5, 2.5 * p.w)
          ctx.stroke()
        }
      }
      flash *= 0.8
      if (flash < 0.01) flash = 0
      applyFlash(flash)
      if (bolts.length || flash) raf = requestAnimationFrame(frame)
      else raf = 0
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const paintIdle = () => {
      cancelAnimationFrame(raf)
      raf = 0
      bolts = []
      flash = 0
      applyFlash(0)
      ctx.clearRect(0, 0, W, H)
    }

    const setLive = (on: boolean) => {
      wrap.classList.toggle("storm-live", on)
    }

    const arm = (ms: number) => {
      clearTimeout(timer)
      timer = setTimeout(strike, ms)
    }

    const strike = () => {
      if (!onScreen || document.hidden) return
      if (W < 2 || H < 2) resize()
      const now = performance.now()
      bolts.push(makeBolt(W, H, now))
      if (Math.random() < 0.3) bolts.push(makeBolt(W, H, now))
      flash = Math.min(0.62, flash + rand(0.34, 0.52))
      kick()
      // Visible, mais le canvas se rendort : un passage toutes les 5 à 8 secondes.
      arm(rand(5000, 8000))
    }

    const onVis = () => {
      if (document.hidden || !onScreen) {
        clearTimeout(timer)
        setLive(false)
        paintIdle()
        return
      }
      setLive(true)
      arm(rand(400, 1000))
    }
    document.addEventListener("visibilitychange", onVis)
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      onVis()
    }, { threshold: 0.2 })
    io.observe(wrap)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
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

      <svg viewBox="0 0 46 64" className="hero-bolt pointer-events-none absolute left-[18%] top-[8%] w-10 sm:w-14" aria-hidden="true">
        <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#F4F0FF" stroke="#B355FF" strokeWidth="1" />
      </svg>
      <svg viewBox="0 0 46 64" className="hero-bolt hero-bolt-b pointer-events-none absolute right-[22%] top-[6%] w-8 sm:w-12" aria-hidden="true">
        <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#FFFFFF" stroke="#D9AFFF" strokeWidth="1" />
      </svg>
      <svg viewBox="0 0 46 64" className="hero-bolt hero-bolt-c pointer-events-none absolute left-[42%] top-[18%] w-7 sm:left-[36%] sm:w-11" aria-hidden="true">
        <path d="M28 0L4 34H20L14 64L42 26H24L28 0Z" fill="#E7D6FF" stroke="#FFFFFF" strokeWidth="1" />
      </svg>

      {/* Éclair dessiné : un passage court, pas un rendu continu */}
      <canvas ref={canvasRef} className="absolute inset-0 z-[2] h-full w-full" />
    </div>
  )
}
