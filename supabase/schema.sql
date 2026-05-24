-- FinTrack public multi-user encrypted vault storage.
-- Run this in Supabase SQL Editor.

create table if not exists public.moneyflow_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version integer not null default 1,
  ciphertext text not null,
  iv text not null,
  password_salt text not null,
  password_key_iv text not null,
  password_wrapped_key text not null,
  recovery_salt text not null,
  recovery_key_iv text not null,
  recovery_wrapped_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moneyflow_vaults enable row level security;

drop policy if exists "moneyflow select own vault" on public.moneyflow_vaults;
create policy "moneyflow select own vault"
on public.moneyflow_vaults
for select
using (auth.uid() = user_id);

drop policy if exists "moneyflow insert own vault" on public.moneyflow_vaults;
create policy "moneyflow insert own vault"
on public.moneyflow_vaults
for insert
with check (auth.uid() = user_id);

drop policy if exists "moneyflow update own vault" on public.moneyflow_vaults;
create policy "moneyflow update own vault"
on public.moneyflow_vaults
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "moneyflow delete own vault" on public.moneyflow_vaults;
create policy "moneyflow delete own vault"
on public.moneyflow_vaults
for delete
using (auth.uid() = user_id);

create or replace function public.set_moneyflow_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists moneyflow_vaults_updated_at on public.moneyflow_vaults;
create trigger moneyflow_vaults_updated_at
before update on public.moneyflow_vaults
for each row
execute function public.set_moneyflow_updated_at();
