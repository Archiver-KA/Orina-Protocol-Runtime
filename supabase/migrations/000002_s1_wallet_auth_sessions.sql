-- ATP2 Batch D1 / S1 (wallet auth + session)
-- Schema-only. No RLS in D1.

create table if not exists public.wallet_auth_challenges (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  nonce text not null,
  message text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  ip_hash text null,
  user_agent_hash text null,
  constraint wallet_auth_challenges_wallet_address_lower_chk
    check (wallet_address = lower(wallet_address) and wallet_address <> ''),
  constraint wallet_auth_challenges_nonce_uk unique (nonce),
  constraint wallet_auth_challenges_expires_after_created_chk
    check (expires_at > created_at),
  constraint wallet_auth_challenges_used_after_created_chk
    check (used_at is null or used_at >= created_at)
);

create index if not exists idx_wallet_auth_challenges_wallet_address
  on public.wallet_auth_challenges (wallet_address);

create index if not exists idx_wallet_auth_challenges_expires_at
  on public.wallet_auth_challenges (expires_at);

create table if not exists public.wallet_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  session_token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  last_seen_at timestamptz null,
  device_label text null,
  ip_hash text null,
  user_agent_hash text null,
  constraint wallet_sessions_wallet_address_lower_chk
    check (wallet_address = lower(wallet_address) and wallet_address <> ''),
  constraint wallet_sessions_session_token_hash_uk unique (session_token_hash),
  constraint wallet_sessions_expires_after_created_chk
    check (expires_at > created_at),
  constraint wallet_sessions_revoked_after_created_chk
    check (revoked_at is null or revoked_at >= created_at)
);

create index if not exists idx_wallet_sessions_wallet_address
  on public.wallet_sessions (wallet_address);

create index if not exists idx_wallet_sessions_expires_at
  on public.wallet_sessions (expires_at);

