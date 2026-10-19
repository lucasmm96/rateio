-- =============================================================================
-- 0000_init.sql — schema base
-- Aplicar com: drizzle-kit migrate  OU  psql $DATABASE_URL -f este-arquivo
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Função auxiliar de JWT (compatível com Neon Data API / PostgREST)
-- Lê o sub do JWT injetado pelo proxy em request.jwt.claims
-- ---------------------------------------------------------------------------
create or replace function auth_user_id() returns text
  language sql stable
  as $$
    select nullif(
      current_setting('request.jwt.claims', true), ''
    )::jsonb->>'sub'
  $$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rateios
-- ---------------------------------------------------------------------------
create table if not exists rateios (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  corrigir_ipca       boolean not null default true,
  criado_por_user_id  uuid not null references users(id),
  criado_em           timestamptz not null default now(),
  arquivado_em        timestamptz
);

-- ---------------------------------------------------------------------------
-- membros
-- Σ cota = 1 por rateio: garantido pelo trigger trg_cotas_somam_1
-- ---------------------------------------------------------------------------
create table if not exists membros (
  rateio_id  uuid not null references rateios(id) on delete cascade,
  user_id    uuid not null references users(id),
  cota       numeric(9,6) not null default 0
               check (cota >= 0 and cota <= 1),
  criado_em  timestamptz not null default now(),
  primary key (rateio_id, user_id)
);

-- ---------------------------------------------------------------------------
-- despesas
-- Sem coluna situacao: data <= hoje → paga; data > hoje → prevista (runtime)
-- ---------------------------------------------------------------------------
create table if not exists despesas (
  id               uuid primary key default gen_random_uuid(),
  rateio_id        uuid not null references rateios(id) on delete cascade,
  data             date not null,
  descricao        text not null,
  pagador_user_id  uuid not null references users(id),
  valor            numeric(14,2) not null check (valor > 0),
  boleto_url       text,
  comprovante_url  text,
  criado_em        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- reembolsos
-- ---------------------------------------------------------------------------
create table if not exists reembolsos (
  id                uuid primary key default gen_random_uuid(),
  rateio_id         uuid not null references rateios(id) on delete cascade,
  data              date not null,
  pagador_user_id   uuid not null references users(id),
  recebedor_user_id uuid not null references users(id),
  valor             numeric(14,2) not null check (valor > 0),
  observacao        text,
  criado_em         timestamptz not null default now(),
  check (pagador_user_id <> recebedor_user_id)
);

-- ---------------------------------------------------------------------------
-- taxas_ipca
-- ---------------------------------------------------------------------------
create table if not exists taxas_ipca (
  mes   date primary key,
  taxa  numeric(8,4) not null
);

-- ---------------------------------------------------------------------------
-- config
-- ---------------------------------------------------------------------------
create table if not exists config (
  chave  text primary key,
  valor  jsonb not null
);

-- ---------------------------------------------------------------------------
-- config padrão
-- ---------------------------------------------------------------------------
insert into config (chave, valor)
values
  ('serie_bcb',   '433'::jsonb),
  ('data_base',   '"2025-12-01"'::jsonb),
  ('indice_base', '1000'::jsonb)
on conflict (chave) do nothing;
