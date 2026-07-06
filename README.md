# FULLTERPS33 — Streetwear

Site e-commerce streetwear, Next.js 14 (App Router) + TypeScript + Tailwind CSS,
avec base de données Postgres (produits, comptes clients, codes promo, commandes).

## 1. Créer la base de données (Neon, gratuit)

1. Sur [vercel.com](https://vercel.com), ouvrez votre projet → onglet **Storage** → **Create Database** → **Neon Postgres** (ou Postgres tout court selon l'offre affichée)
2. Une fois créée, Vercel vous donne une variable `DATABASE_URL` (ou `POSTGRES_URL`) — copiez-la
3. Toujours dans **Storage**, connectez cette base à votre projet si ce n'est pas automatique

## 2. Configurer les variables d'environnement

**En local**, copiez `.env.example` en `.env.local` et remplissez :
```bash
cp .env.example .env.local
```
- `DATABASE_URL` : collée depuis Neon/Vercel
- `SESSION_SECRET` : une chaîne aléatoire longue (`openssl rand -hex 32`)
- `ADMIN_PASSWORD` : le mot de passe que vous voulez pour accéder à `/admin`

**Sur Vercel** : Project → **Settings** → **Environment Variables** → ajoutez les 3 mêmes variables (DATABASE_URL est probablement déjà ajoutée automatiquement par Neon).

## 3. Installer et initialiser

```bash
npm install
npm run setup-db
```

`setup-db` crée les tables (produits, clients, codes promo, commandes) et insère 8 produits de démonstration si la table est vide.

## 4. Lancer en local

```bash
npm run dev
```
[http://localhost:3000](http://localhost:3000)

## 5. Déployer sur Vercel

```bash
git add -A
git commit -m "Ajoute base de données, comptes, promos, admin"
git push
```
Vercel redéploie automatiquement. **Important** : après le tout premier déploiement avec la base de données connectée, lancez `npm run setup-db` (en local, avec le `DATABASE_URL` de production dans `.env.local`) pour créer les tables — Vercel ne le fait pas pour vous automatiquement.

## Fonctionnalités

- **Accueil** (`/`) : hero, sections produits lues depuis la base de données
- **Panier** : React Context, codes promo appliqués en temps réel, commande enregistrée en base
- **Compte client** (`/login`, `/compte`) : vraie inscription/connexion (mot de passe hashé), historique de commandes, points de fidélité (1pt/€ dépensé)
- **Panel admin** (`/admin`) : protégé par `ADMIN_PASSWORD`
  - **Produits** : ajouter / modifier / supprimer
  - **Codes promo** : créer des codes en % ou en €, montant minimum, activer/désactiver
  - **Commandes** : voir toutes les commandes, changer leur statut (En préparation / Expédiée / Livrée / Annulée)

Le lien vers `/admin` n'est volontairement pas affiché dans la navbar — accédez-y directement via l'URL.

## Ce qui n'est toujours PAS inclus

- Paiement réel (ex. Stripe Checkout) — les commandes sont enregistrées mais aucun paiement n'est prélevé
- Envoi d'emails (confirmation de commande, etc.)
- Upload d'images produits (le champ `image` est juste une étiquette texte pour l'instant, pas un vrai fichier)

## Personnaliser

- Palette / typographies : `tailwind.config.ts`, `app/layout.tsx`
- Textes de marque : `components/hero.tsx`, `components/footer.tsx`
- Schéma de base de données : `db/schema.sql`
