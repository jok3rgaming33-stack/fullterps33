'use client'

import { useState } from 'react'
import { LogOut, Package, Tag, Zap, BarChart3, Settings } from 'lucide-react'
import { adminLogout } from '@/app/actions/admin-auth'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/types'
import type { PromoCode } from '@/app/actions/promo'

type Order = any

interface AdminDashboardProps {
  products: Product[]
  promos: PromoCode[]
  orders: Order[]
}

const DASHBOARD_TABS = [
  { id: 'overview', label: 'Aperçu', icon: BarChart3 },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'categories', label: 'Catégories', icon: Tag },
  { id: 'promos', label: 'Codes Promo', icon: Zap },
  { id: 'settings', label: 'Paramètres', icon: Settings },
] as const

export function AdminDashboard({ products, promos, orders }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<typeof DASHBOARD_TABS[number]['id']>('overview')
  const router = useRouter()

  const handleLogout = async () => {
    await adminLogout()
    router.push('/admin')
  }

  // Stats
  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    activeCodes: promos.filter(p => p.active).length,
  }

  return (
    <div className="min-h-screen bg-void text-ivory">
      {/* Header */}
      <header className="border-b border-white/10 bg-surface/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-electric to-violet-light flex items-center justify-center">
              <Zap className="w-6 h-6 text-void" />
            </div>
            <div>
              <h1 className="font-display text-xl tracking-wide">FULLTERPS33</h1>
              <p className="font-mono text-xs text-ivory/40">Panel Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition font-mono text-xs uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 border-r border-white/10 bg-surface/20">
          <nav className="p-4 space-y-2">
            {DASHBOARD_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${
                    isActive
                      ? 'bg-violet-electric/20 text-violet-electric border border-violet-electric/30'
                      : 'text-ivory/60 hover:text-ivory hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-mono text-sm uppercase tracking-wider">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-2xl tracking-wide mb-6">Aperçu</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Produits', value: stats.totalProducts, icon: Package },
                    { label: 'Commandes', value: stats.totalOrders, icon: Tag },
                    { label: 'Revenus', value: `${(stats.totalRevenue / 100).toFixed(0)}€`, icon: Zap },
                    { label: 'Codes actifs', value: stats.activeCodes, icon: Settings },
                  ].map((stat) => {
                    const StatIcon = stat.icon
                    return (
                      <div
                        key={stat.label}
                        className="border border-white/10 bg-surface/50 rounded-lg p-6 hover:bg-surface/80 transition"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-mono text-xs uppercase tracking-wider text-ivory/50">
                            {stat.label}
                          </span>
                          <StatIcon className="w-5 h-5 text-violet-electric opacity-60" />
                        </div>
                        <p className="font-display text-3xl tracking-wide">{stat.value}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-lg tracking-wide mb-4">Activité récente</h3>
                <div className="border border-white/10 bg-surface/50 rounded-lg p-6">
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border border-white/5 rounded hover:bg-white/5 transition"
                      >
                        <div>
                          <p className="font-mono text-sm">
                            Commande <span className="text-violet-light">#{order.id}</span>
                          </p>
                          <p className="font-mono text-xs text-ivory/40">
                            {new Date(order.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg">{(order.total / 100).toFixed(0)}€</p>
                          <p className="font-mono text-xs text-ivory/40">{order.status}</p>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <p className="text-center font-mono text-sm text-ivory/40">Aucune commande</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <h2 className="font-display text-2xl tracking-wide mb-6">Gestion des produits</h2>
              <div className="border border-white/10 bg-surface/50 rounded-lg p-6">
                <p className="text-ivory/60">Les fonctionnalités de gestion des produits apparaissent ici.</p>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <h2 className="font-display text-2xl tracking-wide mb-6">Gestion des catégories</h2>
              <div className="border border-white/10 bg-surface/50 rounded-lg p-6">
                <p className="text-ivory/60">Les fonctionnalités de gestion des catégories apparaissent ici.</p>
              </div>
            </div>
          )}

          {activeTab === 'promos' && (
            <div>
              <h2 className="font-display text-2xl tracking-wide mb-6">Codes promotionnels</h2>
              <div className="border border-white/10 bg-surface/50 rounded-lg p-6">
                <p className="text-ivory/60">Les fonctionnalités de gestion des codes apparaissent ici.</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="font-display text-2xl tracking-wide mb-6">Paramètres</h2>
              <div className="border border-white/10 bg-surface/50 rounded-lg p-6">
                <p className="text-ivory/60">Les paramètres d'administration apparaissent ici.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
