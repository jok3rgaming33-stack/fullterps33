"use client"

import { useState } from "react"
import { LogOut, Package, Tag, Zap, BarChart3, Settings, Users, ShoppingBag, MessageSquare, ShieldCheck, MapPin } from "lucide-react"
import { adminLogout } from "@/app/actions/admin"
import { useRouter } from "next/navigation"
import type { Product } from "@/lib/types"
import type { PromoCode } from "@/app/actions/promo"
import { AdminProductsPanel } from "@/components/admin-products-panel"
import { AdminOrdersPanel } from "@/components/admin-orders-panel"
import { AdminPromosPanel } from "@/components/admin-promos-panel"
import { AdminUsersPanel } from "@/components/admin-users"
import { AdminMessagingPanel } from "@/components/admin-messaging-panel"
import { AdminSettingsPanel } from "@/components/admin-settings-panel"
import { AdminVerificationsPanel } from "@/components/admin-verifications"
import { AdminMap } from "@/components/admin-map"
import { AdminSectionsPanel } from "@/components/admin-sections-panel"
import type { AdminUser } from "@/app/actions/account"
import type { OrderThread } from "@/app/actions/messaging"
import type { NewsItem, CartConfig, ShopSection } from "@/app/actions/settings"
import type { VerificationRow } from "@/app/actions/verification"
import { formatPrice } from "@/lib/utils"

type OrderItem = { productId: string; name: string; size: string; price: number; quantity: number }
type Order = {
  id: number
  customerEmail: string | null
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  promoCode: string | null
  status: string
  createdAt: string
}
interface AdminDashboardProps {
  products: Product[]
  promos: PromoCode[]
  orders: Order[]
  users?: AdminUser[]
  threads?: OrderThread[]
  appSettings?: Record<string, any>
  news?: NewsItem[]
  cartConfig?: CartConfig
  verifications?: VerificationRow[]
  sections?: ShopSection[]
}

const TABS = [
  { id: "overview",   label: "Aperçu",    icon: BarChart3     },
  { id: "products",   label: "Produits",  icon: Package       },
  { id: "sections",   label: "Sections",  icon: Tag           },
  { id: "orders",     label: "Commandes", icon: ShoppingBag   },
  { id: "messages",   label: "Messages",  icon: MessageSquare },
  { id: "map",        label: "Carte",     icon: MapPin        },
  { id: "kyc",        label: "KYC",       icon: ShieldCheck   },
  { id: "promos",     label: "Codes",     icon: Zap           },
  { id: "users",      label: "Membres",   icon: Users         },
  { id: "settings",   label: "Réglages",  icon: Settings      },
] as const

type TabId = typeof TABS[number]["id"]

export function AdminDashboard({ products, promos, orders, users = [], threads = [], appSettings = {}, news = [], cartConfig, verifications = [], sections = [] }: AdminDashboardProps) {
  const [active, setActive] = useState<TabId>("overview")
  const router = useRouter()

  const handleLogout = async () => {
    await adminLogout()
    router.push("/admin")
    router.refresh()
  }

  const stats = {
    products: products.length,
    orders:   orders.length,
    revenue:  orders.reduce((s, o) => s + (o.total || 0), 0),
    codes:    promos.filter((p) => p.active).length,
    members:  users.length,
  }

  return (
    <div className="flex min-h-screen flex-col bg-void text-ivory">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-surface/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-electric/15 ring-1 ring-violet-electric/30">
              <Zap className="h-5 w-5 text-violet-electric animate-flicker" />
            </div>
            <div>
              <p className="font-display text-base tracking-widest">FULLTERPS33</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ivory/40">
                Administration
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-ivory/60 transition hover:border-violet-electric/50 hover:text-ivory"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Mobile tab bar — full width, sticky below header ── */}
      <div className="sticky top-[57px] z-40 flex w-full overflow-x-auto border-b border-white/10 bg-void/95 backdrop-blur-md md:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`flex shrink-0 flex-col items-center gap-1 px-4 py-3 font-mono text-[9px] uppercase tracking-widest transition ${
              active === id
                ? "border-b-2 border-violet-electric text-violet-electric"
                : "text-ivory/40 hover:text-ivory/70"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-screen-xl flex-1 px-0">
        {/* ── Sidebar desktop only ── */}
        <aside className="hidden w-52 shrink-0 border-r border-white/10 bg-surface/20 md:block">
          <nav className="flex flex-col gap-1 p-4 pt-6">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = active === id
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={`flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition ${
                    isActive
                      ? "bg-violet-electric/15 text-violet-electric ring-1 ring-violet-electric/25"
                      : "text-ivory/50 hover:bg-white/5 hover:text-ivory"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-mono text-[11px] uppercase tracking-widest">{label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 p-4 md:p-8">

          {/* OVERVIEW */}
          {active === "overview" && (
            <div className="space-y-8 animate-rise-fade">
              <h2 className="font-display text-2xl tracking-wide">Aperçu</h2>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  { label: "Produits",  value: stats.products, icon: Package    },
                  { label: "Commandes", value: stats.orders,   icon: ShoppingBag},
                  { label: "Revenus",   value: formatPrice(stats.revenue), icon: Zap },
                  { label: "Codes actifs", value: stats.codes, icon: Tag        },
                  { label: "Membres",   value: stats.members,  icon: Users      },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="clip-card border border-white/10 bg-surface/50 p-4 transition hover:bg-surface/80"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-ivory/40">
                        {label}
                      </span>
                      <Icon className="h-4 w-4 text-violet-electric/50" />
                    </div>
                    <p className="font-display text-2xl tracking-wide">{value}</p>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div>
                <h3 className="mb-4 font-display text-lg tracking-wide">Commandes récentes</h3>
                <div className="border border-white/10 bg-surface/40 rounded">
                  {orders.length === 0 ? (
                    <p className="p-6 text-center font-mono text-sm text-ivory/40">
                      Aucune commande pour l&apos;instant.
                    </p>
                  ) : (
                    orders.slice(0, 6).map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between border-b border-white/5 px-5 py-3 last:border-0 hover:bg-white/[0.03] transition"
                      >
                        <div>
                          <p className="font-mono text-sm">
                            Commande{" "}
                            <span className="text-violet-electric">#{o.id}</span>
                          </p>
                          <p className="font-mono text-[10px] text-ivory/40">
                            {o.customerEmail ?? "Token session"} &middot;{" "}
                            {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-base">{formatPrice(o.total)}</p>
                          <p className="font-mono text-[10px] text-ivory/40">{o.status}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {active === "products" && (
            <div className="animate-rise-fade">
              <h2 className="mb-6 font-display text-2xl tracking-wide">Produits</h2>
              <AdminProductsPanel products={products} sections={sections} />
            </div>
          )}

          {/* SECTIONS */}
          {active === "sections" && (
            <div className="animate-rise-fade">
              <AdminSectionsPanel initial={sections} products={products} />
            </div>
          )}

          {/* ORDERS */}
          {active === "orders" && (
            <div className="animate-rise-fade">
              <h2 className="mb-6 font-display text-2xl tracking-wide">Commandes</h2>
              <AdminOrdersPanel orders={orders} />
            </div>
          )}

          {/* MESSAGES */}
          {active === "messages" && (
            <div className="animate-rise-fade">
              <h2 className="mb-6 font-display text-2xl tracking-wide">Messages</h2>
              <AdminMessagingPanel initial={threads} />
            </div>
          )}

          {/* PROMOS */}
          {active === "promos" && (
            <div className="animate-rise-fade">
              <h2 className="mb-6 font-display text-2xl tracking-wide">Codes promotionnels</h2>
              <AdminPromosPanel promos={promos} />
            </div>
          )}

          {/* USERS / MEMBRES */}
          {active === "users" && (
            <div className="animate-rise-fade">
              <h2 className="mb-6 font-display text-2xl tracking-wide">
                Membres{" "}
                <span className="text-violet-electric/70 text-xl">({users.length})</span>
              </h2>
              <AdminUsersPanel users={users} />
            </div>
          )}

          {/* CARTE */}
          {active === "map" && (
            <div className="animate-rise-fade">
              <h2 className="mb-6 font-display text-2xl tracking-wide">Carte de tournée</h2>
              <AdminMap threads={threads} />
            </div>
          )}

          {/* KYC */}
          {active === "kyc" && (
            <div className="animate-rise-fade">
              <h2 className="mb-6 font-display text-2xl tracking-wide">
                Vérifications KYC{" "}
                {verifications.length > 0 && (
                  <span className="text-violet-electric/70 text-xl">({verifications.length})</span>
                )}
              </h2>
              <AdminVerificationsPanel initial={verifications} />
            </div>
          )}

          {/* SETTINGS */}
          {active === "settings" && (
            <div className="animate-rise-fade">
              <h2 className="mb-6 font-display text-2xl tracking-wide">Réglages</h2>
              <AdminSettingsPanel settings={appSettings} news={news} cartConfig={cartConfig} />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
