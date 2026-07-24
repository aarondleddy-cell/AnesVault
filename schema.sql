-- AnesVault Credential Tracker schema
-- Run in Supabase SQL editor (project dfcajbdhgcgzhtnazsfw)

create extension if not exists "pgcrypto";

create table if not exists credential_holders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('self', 'employee')),
  created_at timestamptz not null default now()
);

create type credential_category as enum ('ACLS', 'BLS', 'PALS', 'DEA', 'Malpractice', 'Custom');

create table if not exists credentials (
  id uuid primary key default gen_random_uuid(),
  holder_id uuid not null references credential_holders(id) on delete cascade,
  category credential_category not null,
  custom_label text,
  issue_date date,
  expiration_date date not null,
  notes text,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_holders_user on credential_holders(user_id);
create index if not exists idx_credentials_holder on credentials(holder_id);
create index if not exists idx_credentials_expiration on credentials(expiration_date);

alter table credential_holders enable row level security;
alter table credentials enable row level security;

create policy "owners manage own holders" on credential_holders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owners manage own credentials" on credentials
  for all using (
    exists (select 1 from credential_holders h where h.id = holder_id and h.user_id = auth.uid())
  ) with check (
    exists (select 1 from credential_holders h where h.id = holder_id and h.user_id = auth.uid())
  );

-- Storage bucket for credential documents (create via dashboard or here)
insert into storage.buckets (id, name, public) values ('credential-docs', 'credential-docs', false)
  on conflict (id) do nothing;

create policy "owners access own documents" on storage.objects
  for all using (bucket_id = 'credential-docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'credential-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- trigger to keep updated_at fresh
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger credentials_set_updated_at
  before update on credentials
  for each row execute function set_updated_at();
