-- CLX Finance – vollständiges Schema mit RLS & Policies
create extension if not exists "pgcrypto";

-- Tabellen
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  description text,
  amount numeric(12,2) not null,
  is_income boolean not null default false,
  created_at timestamptz default now()
);

-- Zusatzfeatures
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  month text not null, -- YYYY-MM
  category_id uuid references public.categories(id) on delete cascade,
  amount numeric(12,2) not null,
  created_at timestamptz default now(),
  unique(user_id, month, category_id)
);

create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  start_date date,
  every text not null default 'monthly', -- monthly/weekly
  description text,
  amount numeric(12,2) not null,
  is_income boolean not null default false,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz default now()
);

-- RLS aktivieren
alter table public.accounts      enable row level security;
alter table public.categories    enable row level security;
alter table public.transactions  enable row level security;
alter table public.budgets       enable row level security;
alter table public.recurring     enable row level security;

-- Policies
drop policy if exists accounts_rw on public.accounts;
create policy accounts_rw on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists categories_rw on public.categories;
create policy categories_rw on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists transactions_rw on public.transactions;
create policy transactions_rw on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists budgets_rw on public.budgets;
create policy budgets_rw on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists recurring_rw on public.recurring;
create policy recurring_rw on public.recurring
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indizes
create index if not exists idx_tx_user_date on public.transactions(user_id, date desc);
create index if not exists idx_tx_user_cat  on public.transactions(user_id, category_id);
create index if not exists idx_tx_user_acc  on public.transactions(user_id, account_id);
