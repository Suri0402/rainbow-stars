-- Rainbow Stars: Familien-Konto einrichten.
-- Diesen GANZEN Inhalt in Supabase -> SQL Editor -> New query einfügen und "Run" drücken.
-- Kann gefahrlos mehrmals ausgeführt werden.

-- Alle Spielstände der Familie (Schlüssel/Wert)
create table if not exists public.family_kv (
  family_id  uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (family_id, key)
);
create index if not exists family_kv_changes on public.family_kv (family_id, updated_at);
alter table public.family_kv enable row level security;
drop policy if exists "kv lesen"   on public.family_kv;
drop policy if exists "kv anlegen" on public.family_kv;
drop policy if exists "kv ändern"  on public.family_kv;
drop policy if exists "kv löschen" on public.family_kv;
create policy "kv lesen"   on public.family_kv for select to authenticated using (family_id = auth.uid());
create policy "kv anlegen" on public.family_kv for insert to authenticated with check (family_id = auth.uid());
create policy "kv ändern"  on public.family_kv for update to authenticated using (family_id = auth.uid()) with check (family_id = auth.uid());
create policy "kv löschen" on public.family_kv for delete to authenticated using (family_id = auth.uid());

-- Eingescannte Figuren (das Bild liegt im privaten Speicher "family")
create table if not exists public.family_creatures (
  id         uuid primary key,
  family_id  uuid not null references auth.users(id) on delete cascade,
  owner      text,
  name       text,
  kind       text,
  world      text,
  book       text,
  created    bigint,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists family_creatures_changes on public.family_creatures (family_id, updated_at);
alter table public.family_creatures enable row level security;
drop policy if exists "fig lesen"   on public.family_creatures;
drop policy if exists "fig anlegen" on public.family_creatures;
drop policy if exists "fig ändern"  on public.family_creatures;
create policy "fig lesen"   on public.family_creatures for select to authenticated using (family_id = auth.uid());
create policy "fig anlegen" on public.family_creatures for insert to authenticated with check (family_id = auth.uid());
create policy "fig ändern"  on public.family_creatures for update to authenticated using (family_id = auth.uid()) with check (family_id = auth.uid());

-- Privater Bildspeicher: jede Familie nur in ihrem eigenen Ordner
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family', 'family', false, 2097152, array['image/png'])
on conflict (id) do nothing;
drop policy if exists "bild lesen"   on storage.objects;
drop policy if exists "bild anlegen" on storage.objects;
drop policy if exists "bild ändern"  on storage.objects;
create policy "bild lesen"   on storage.objects for select to authenticated using (bucket_id = 'family' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "bild anlegen" on storage.objects for insert to authenticated with check (bucket_id = 'family' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "bild ändern"  on storage.objects for update to authenticated using (bucket_id = 'family' and (storage.foldername(name))[1] = auth.uid()::text);
