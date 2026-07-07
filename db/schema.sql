-- FULLTERPS33 — schéma de base de données (style BB33)
-- Exécuté automatiquement par scripts/setup-db.mjs

create table if not exists users (
  id serial primary key,
  token text unique not null,
  pseudo text not null,
  loyalty_points integer not null default 0,
  loyalty_adjustment integer not null default 0,
  flags jsonb not null default '[]',
  created_at timestamptz not null default now(),
  created_ip text
);

create table if not exists user_registrations_ip (
  id serial primary key,
  ip text not null,
  count integer not null default 1,
  last_registration timestamptz not null default now()
);

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
  user_token text references users(token) on delete set null,
  items jsonb not null,
  subtotal integer not null,
  discount integer not null default 0,
  total integer not null,
  promo_code text,
  status text not null default 'En préparation',
  created_at timestamptz not null default now()
);
