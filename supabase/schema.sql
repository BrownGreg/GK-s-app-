-- Nos envies — schéma complet.
-- À coller dans l'éditeur SQL de Supabase, en une seule fois.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- couples

create table if not exists couples (
  id              uuid primary key default gen_random_uuid(),
  code_invitation text unique not null,
  phrase_perso    text default '',
  cree_le         timestamptz default now()
);

-- ---------------------------------------------------------------- profils

create table if not exists profils (
  id         uuid primary key references auth.users on delete cascade,
  prenom     text not null,
  avatar_url text,
  couple_id  uuid references couples on delete set null,
  cree_le    timestamptz default now()
);

-- Si la table existait déjà avant l'ajout de la photo de profil.
alter table profils add column if not exists avatar_url text;

-- ------------------------------------------------------------------ items

create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples on delete cascade,
  cree_par     uuid references profils on delete set null,
  titre        text not null,
  description  text default '',
  type         text not null default 'activite'
               check (type in ('lieu', 'activite', 'resto', 'cafe', 'bar', 'nourriture', 'media', 'objet', 'autre')),
  -- Sortie à deux (avec lieu/planification) ou souhait personnel (nourriture,
  -- média, objet à acheter…) : deux onglets séparés dans l'app.
  wishlist     boolean not null default false,
  tags         text[] default '{}',
  fait         boolean not null default false,
  date_faite   date,
  date_prevue  timestamptz,
  date_fin     timestamptz, -- facultative : pour les envies sur plusieurs jours (ex. week-end).
  -- Avis par personne : { "<profil_id>": { "note": 1-5, "commentaire": "..." } }.
  -- Une seule colonne note/commentaire aurait été écrasée par le dernier qui la modifie.
  avis         jsonb not null default '{}'::jsonb,
  photos       text[] default '{}',
  -- Nullables : une envie peut se vivre à la maison, sans coordonnées.
  lat          double precision,
  lng          double precision,
  place_id     text,
  adresse      text,
  cree_le      timestamptz default now()
);

create index if not exists items_couple_idx on items (couple_id, fait, cree_le desc);

-- Si la table existait déjà avant l'ajout des types café/bar/wishlist.
alter table items drop constraint if exists items_type_check;
alter table items add constraint items_type_check
  check (type in ('lieu', 'activite', 'resto', 'cafe', 'bar', 'nourriture', 'media', 'objet', 'autre'));

-- Si la table existait déjà avant l'ajout de la planification.
alter table items add column if not exists date_prevue timestamptz;

-- Si la table existait déjà avant l'ajout de l'onglet wishlist.
alter table items add column if not exists wishlist boolean not null default false;

-- Si la table existait déjà avant l'ajout de la date de fin optionnelle.
alter table items add column if not exists date_fin timestamptz;

-- Si la table existait déjà avant le passage à l'avis par personne : on
-- migre note/commentaire (attribués à qui a créé l'envie, faute de mieux
-- puisqu'ils n'étaient pas suivis par personne) puis on supprime les
-- anciennes colonnes partagées.
alter table items add column if not exists avis jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'items' and column_name = 'note'
  ) then
    update items set avis = avis || jsonb_build_object(
      cree_par::text, jsonb_build_object('note', note, 'commentaire', commentaire)
    )
    where cree_par is not null and (note is not null or coalesce(commentaire, '') <> '');
    alter table items drop column note;
    alter table items drop column commentaire;
  end if;
end $$;

-- ---------------------------------------------------------------- requêtes
-- Demandes texte libre adressées au/à la partenaire (« peux-tu... »), qui
-- peuvent ensuite être transformées en tâche dans l'onglet À faire.

create table if not exists requetes (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples on delete cascade,
  demande_par uuid references profils on delete set null,
  texte       text not null,
  statut      text not null default 'ouverte' check (statut in ('ouverte', 'ajoutee')),
  cree_le     timestamptz default now()
);

create index if not exists requetes_couple_idx on requetes (couple_id, cree_le desc);

-- Le couple_id est déduit du profil : le client n'a pas à l'envoyer.
create or replace function mon_couple()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select couple_id from profils where id = auth.uid() $$;

create or replace function remplir_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.couple_id is null then new.couple_id := mon_couple(); end if;
  return new;
end $$;

drop trigger if exists items_remplir_couple on items;
create trigger items_remplir_couple before insert on items
for each row execute function remplir_couple();

drop trigger if exists requetes_remplir_couple on requetes;
create trigger requetes_remplir_couple before insert on requetes
for each row execute function remplir_couple();

-- ------------------------------------------------------- règles de partage

alter table couples  enable row level security;
alter table profils  enable row level security;
alter table items    enable row level security;
alter table requetes enable row level security;

drop policy if exists couples_lecture on couples;
create policy couples_lecture on couples for select
  using (true);  -- lecture nécessaire pour retrouver un couple par son code

drop policy if exists couples_creation on couples;
create policy couples_creation on couples for insert
  with check (auth.uid() is not null);

drop policy if exists couples_maj on couples;
create policy couples_maj on couples for update
  using (id = mon_couple());

drop policy if exists profils_lecture on profils;
create policy profils_lecture on profils for select
  using (id = auth.uid() or couple_id = mon_couple());

drop policy if exists profils_ecriture on profils;
create policy profils_ecriture on profils for insert
  with check (id = auth.uid());

drop policy if exists profils_maj on profils;
create policy profils_maj on profils for update
  using (id = auth.uid());

-- Toute la logique de partage tient dans ces quatre règles.
drop policy if exists items_lecture on items;
create policy items_lecture on items for select using (couple_id = mon_couple());

drop policy if exists items_creation on items;
create policy items_creation on items for insert with check (couple_id = mon_couple());

drop policy if exists items_maj on items;
create policy items_maj on items for update using (couple_id = mon_couple());

drop policy if exists items_suppression on items;
create policy items_suppression on items for delete using (couple_id = mon_couple());

drop policy if exists requetes_lecture on requetes;
create policy requetes_lecture on requetes for select using (couple_id = mon_couple());

drop policy if exists requetes_creation on requetes;
create policy requetes_creation on requetes for insert with check (couple_id = mon_couple());

drop policy if exists requetes_maj on requetes;
create policy requetes_maj on requetes for update using (couple_id = mon_couple());

drop policy if exists requetes_suppression on requetes;
create policy requetes_suppression on requetes for delete using (couple_id = mon_couple());

-- --------------------------------------------------------------- temps réel

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'requetes'
  ) then
    alter publication supabase_realtime add table requetes;
  end if;
end $$;

-- ------------------------------------------------------------------ photos
-- Créer ensuite un bucket public nommé « photos » dans Storage,
-- puis appliquer ces deux règles :

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists photos_lecture on storage.objects;
create policy photos_lecture on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists photos_envoi on storage.objects;
create policy photos_envoi on storage.objects for insert
  with check (bucket_id = 'photos' and auth.uid() is not null);

-- Nécessaire pour l'avatar : même chemin réécrit à chaque changement de photo.
drop policy if exists photos_maj on storage.objects;
create policy photos_maj on storage.objects for update
  using (bucket_id = 'photos' and auth.uid() is not null);
