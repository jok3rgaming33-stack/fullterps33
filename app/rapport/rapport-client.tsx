"use client"

import { useRef } from "react"

interface Stats {
  users: number
  orders: number
  products: number
  promos: number
  verifs: number
  messages: number
  tiers: number
  revenue: number
}

interface Props {
  stats: Stats
  date: string
}

const SECTIONS = [
  {
    title: "Vitrine & Catalogue",
    status: "complete" as const,
    items: [
      "Page d'accueil avec hero animé et sections produits dynamiques",
      "Catalogue produits avec modal détail (description, prix, poids, images)",
      "Sections personnalisables depuis le panel admin (ordre, titre, visibilité)",
      "Catégories produits filtrables",
      "Barre de navigation avec panier en temps réel",
      "Footer informatif",
      "Design responsive mobile-first (Tailwind CSS)",
      "Métadonnées SEO (titre, description, viewport)",
    ],
  },
  {
    title: "Panier & Commandes",
    status: "complete" as const,
    items: [
      "Panier persistant côté client (CartProvider + CartDrawer)",
      "Ajout / suppression / modification des quantités",
      "Application de codes promo (fixe ou pourcentage) à la commande",
      "Formulaire de commande avec adresse de livraison + géocodage",
      "Intégration code fidélité à usage unique",
      "Récapitulatif de commande avec total et réduction appliquée",
      "Création automatique d'un fil de messagerie à chaque commande",
      "Référence commande unique (FT-XXXX)",
    ],
  },
  {
    title: "Authentification & Comptes clients",
    status: "complete" as const,
    items: [
      "Inscription client (pseudo, email, mot de passe hashé bcrypt, token UUID)",
      "Connexion sécurisée avec session cookie HttpOnly",
      "Page compte : historique des commandes, points fidélité, messagerie",
      "Protection anti-doublon des inscriptions par IP et email",
      "Déconnexion sécurisée",
      "Validation des données côté serveur (Server Actions)",
    ],
  },
  {
    title: "Messagerie client ↔ admin",
    status: "complete" as const,
    items: [
      "Fils de discussion liés aux commandes ou demandes générales",
      "Messages texte avec horodatage",
      "Compteur de messages non lus côté admin (badge temps réel)",
      "Interface messagerie client (/messagerie)",
      "Interface messagerie admin avec vue liste + vue conversation",
      "Pièces jointes futures prêtes (structure en place)",
    ],
  },
  {
    title: "Panel d'administration",
    status: "complete" as const,
    items: [
      "Authentification admin par token secret",
      "Dashboard : statistiques clés (produits, commandes, revenus, membres)",
      "Gestion produits : création, édition, suppression, images Vercel Blob",
      "Gestion commandes : statuts (en attente, confirmée, en route, livrée, annulée)",
      "Gestion codes promo : montant fixe ou pourcentage, activation/désactivation",
      "Programme fidélité : CRUD des paliers points → réduction",
      "Gestion membres : liste, points, historique",
      "Vérifications KYC : affichage photo & vidéo, validation ou rejet",
      "Messagerie admin : répondre aux clients",
      "Sections de boutique : ordre, titre, visibilité",
      "Paramètres généraux : token admin, popup actualités, configuration",
      "Carte admin des livraisons (géolocalisation commandes)",
      "Alertes de réapprovisionnement produits",
    ],
  },
  {
    title: "Vérification KYC",
    status: "complete" as const,
    items: [
      "Formulaire de vérification client (selfie + vidéo)",
      "Upload sécurisé vers Vercel Blob (store privé)",
      "Proxy HTTP sécurisé pour visualisation admin (BLOB_READ_WRITE_TOKEN)",
      "Statuts : en attente, validée, rejetée (avec motif)",
      "Notification admin à chaque soumission",
      "Badge de vérification sur le profil client",
    ],
  },
  {
    title: "Programme de fidélité",
    status: "complete" as const,
    items: [
      "1€ dépensé = 1 point crédité automatiquement après commande",
      "3 paliers par défaut : 300 pts → -10€, 500 pts → -20€, 900 pts → -30€",
      "Paliers entièrement paramétrables depuis le panel admin (CRUD)",
      "Génération de codes de récompense à usage unique (FT-XXXX-XXXX)",
      "Anti-doublon : un seul code actif par palier et par client",
      "Application du code en caisse avec débit automatique des points",
      "Modal fidélité client : barre de progression, obtention du code, copie en un clic",
      "Tableau de suivi admin : codes émis, consommés, client associé",
    ],
  },
  {
    title: "Notifications Push (PWA)",
    status: "complete" as const,
    items: [
      "Service Worker enregistré (sw-register)",
      "Abonnement Push Web (VAPID) pour clients et admin",
      "Notifications admin ciblées (role = 'admin') pour : nouvelle inscription, KYC soumis, nouvelle commande, nouveau message",
      "Cloche de notifications admin dans le header avec badge non lus",
      "Liste déroulante des threads non lus, rafraîchissement automatique 20s",
      "Bouton d'abonnement client sur la page compte",
    ],
  },
  {
    title: "Actualités & Communications",
    status: "complete" as const,
    items: [
      "Popup d'actualités configurable depuis le panel admin",
      "Activation / désactivation et contenu libre",
      "Affichage automatique en page d'accueil",
    ],
  },
  {
    title: "Infrastructure technique",
    status: "complete" as const,
    items: [
      "Next.js 16 (App Router, Server Actions, RSC)",
      "Base de données PostgreSQL Neon (14 tables)",
      "Vercel Blob : stockage images produits et fichiers KYC (stores public/privé)",
      "Tailwind CSS v4 — design system cohérent avec tokens",
      "TypeScript strict sur l'ensemble du projet",
      "Sécurité : parameterized queries, bcrypt, HttpOnly cookies, RLS via scoping userId",
      "Déployé sur Vercel (CI/CD automatique sur push)",
    ],
  },
]

const STATUS_LABEL: Record<string, string> = {
  complete: "Livré",
  partial:  "En cours",
  planned:  "Planifié",
}

export function RapportClient({ stats, date }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  return (
    <>
      {/* Print styles injectés dans le head via style tag */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; padding: 20px !important; }
          .page-break { page-break-before: always; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      {/* Bouton impression — masqué à l'impression */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-mono text-xs uppercase tracking-widest px-5 py-3 shadow-lg transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Exporter PDF
        </button>
      </div>

      {/* Document */}
      <div ref={printRef} className="print-page min-h-screen bg-white text-gray-900 font-sans">
        <div className="max-w-4xl mx-auto px-8 py-12">

          {/* En-tête */}
          <div className="border-b-4 border-violet-600 pb-8 mb-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-violet-600 text-white font-black text-xl px-3 py-1.5 tracking-widest">
                    FT33
                  </div>
                  <span className="text-gray-400 font-mono text-sm">FULLTERPS33</span>
                </div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-4">
                  Rapport d&apos;avancement
                </h1>
                <p className="text-gray-500 font-mono text-sm mt-1">
                  État du projet — {date}
                </p>
              </div>
              <div className="text-right">
                <div className="bg-green-50 border border-green-200 px-4 py-2 rounded">
                  <div className="text-green-700 font-black text-sm uppercase tracking-widest">En production</div>
                  <div className="text-green-600 font-mono text-xs mt-0.5">Déployé sur Vercel</div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques live */}
          <section className="mb-10">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 mb-4 border-l-4 border-violet-600 pl-3">
              Données en temps réel
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Membres inscrits", value: stats.users },
                { label: "Commandes",         value: stats.orders },
                { label: "Produits actifs",   value: stats.products },
                { label: "Codes promo actifs",value: stats.promos },
                { label: "KYC soumis",        value: stats.verifs },
                { label: "Messages échangés", value: stats.messages },
                { label: "Paliers fidélité",  value: stats.tiers },
                { label: "Revenu total (€)",  value: `${stats.revenue} €` },
              ].map((stat) => (
                <div key={stat.label} className="border border-gray-200 p-3 bg-gray-50">
                  <div className="text-2xl font-black text-violet-600">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Récapitulatif global */}
          <section className="mb-10">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 mb-4 border-l-4 border-violet-600 pl-3">
              Périmètre livré
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map((section) => (
                <div key={section.title} className="flex items-center justify-between border border-gray-200 px-4 py-2.5 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-800">{section.title}</span>
                  <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    {STATUS_LABEL[section.status]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Détail par module */}
          {SECTIONS.map((section, i) => (
            <section key={section.title} className={`mb-8 ${i === 4 ? "page-break" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black uppercase tracking-widest text-gray-900 border-l-4 border-violet-600 pl-3">
                  {section.title}
                </h2>
                <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {STATUS_LABEL[section.status]}
                </span>
              </div>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <svg className="h-4 w-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Légende technique */}
          <section className="mt-10 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 mb-4 border-l-4 border-violet-600 pl-3">
              Stack technique
            </h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                ["Framework",       "Next.js 16 — App Router"],
                ["Base de données", "PostgreSQL — Neon (14 tables)"],
                ["Stockage fichiers","Vercel Blob (public + privé)"],
                ["Déploiement",     "Vercel (CI/CD automatique)"],
                ["Langage",         "TypeScript strict"],
                ["Style",           "Tailwind CSS v4"],
                ["Auth",            "Session cookie HttpOnly + bcrypt"],
                ["Push",            "Web Push API (VAPID)"],
                ["Paiement",        "— (intégration future possible)"],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 border border-gray-200 px-3 py-2">
                  <div className="font-semibold text-gray-500 text-xs uppercase tracking-wide">{k}</div>
                  <div className="text-gray-800 text-sm font-medium mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Pied de page */}
          <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>FULLTERPS33 — Document confidentiel</span>
            <span>Généré le {date}</span>
          </div>
        </div>
      </div>
    </>
  )
}
