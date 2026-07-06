-- FULLTERPS33 — schéma de base de données
-- Exécuté automatiquement par scripts/setup-db.mjs

create table if not exists products (
  id text primary key,
  name text not null,
  price integer not null,
  category text not null,
  status text not null default 'disponible',
  badge text,
  sizes text[] not null default '{}',
  sku text not null,
  image text,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  name text not null,
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists promo_codes (
  code text primary key,
  type text not null,
  value integer not null,
  min_amount integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id serial primary key,
  customer_id integer references customers(id) on delete set null,
  customer_email text,
  items jsonb not null,
  subtotal integer not null,
  discount integer not null default 0,
  total integer not null,
  promo_code text,
  status text not null default 'En préparation',
  created_at timestamptz not null default now()
);
