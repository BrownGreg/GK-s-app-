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
  id                uuid primary key references auth.users on delete cascade,
  prenom            text not null,
  avatar_url        text,
  humeur            text, -- id d'une humeur (prédéfinie ou perso), visible par le/la partenaire.
  humeur_le         date,
  humeur_image_url  text, -- photo ou GIF facultatif associé à l'humeur du jour.
  message_jour      text, -- petit mot à l'attention du/de la partenaire, pour la journée.
  message_jour_le   date,
  points            integer not null default 0, -- quêtes (requêtes) validées ; ce qu'ils débloquent reste à définir (V3).
  couple_id         uuid references couples on delete set null,
  cree_le           timestamptz default now()
);

-- Si la table existait déjà avant l'ajout de la photo de profil.
alter table profils add column if not exists avatar_url text;

-- Si la table existait déjà avant l'ajout de l'humeur du jour.
alter table profils add column if not exists humeur text;
alter table profils add column if not exists humeur_le date;

-- Si la table existait déjà avant l'ajout du message du jour.
alter table profils add column if not exists message_jour text;
alter table profils add column if not exists message_jour_le date;

-- Si la table existait déjà avant l'ajout de la photo/GIF sur l'humeur.
alter table profils add column if not exists humeur_image_url text;

-- Si la table existait déjà avant le système de points.
alter table profils add column if not exists points integer not null default 0;

-- ------------------------------------------------------------ humeurs perso
-- Humeurs personnalisées (libellé + couleur choisis par l'un des deux),
-- partagées entre les deux membres du couple au même titre que le reste.

create table if not exists humeurs_perso (
  id        uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples on delete cascade,
  label     text not null,
  couleur   text not null,
  cree_le   timestamptz default now()
);

create index if not exists humeurs_perso_couple_idx on humeurs_perso (couple_id);

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
  -- Likes par photo : { "<url>": ["<profil_id>", ...] }.
  photo_likes  jsonb not null default '{}'::jsonb,
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

-- Si la table existait déjà avant les likes sur les photos.
alter table items add column if not exists photo_likes jsonb not null default '{}'::jsonb;

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
  -- 'ajoutee' : différée en tâche dans À faire (peut quand même être validée
  -- ensuite). 'validee' : rendue, fait gagner `points` à qui valide.
  statut      text not null default 'ouverte' check (statut in ('ouverte', 'ajoutee', 'validee')),
  valide_par  uuid references profils on delete set null,
  points      integer not null default 1 check (points > 0),
  cree_le     timestamptz default now()
);

create index if not exists requetes_couple_idx on requetes (couple_id, cree_le desc);

-- Si la table existait déjà avant le système de points.
alter table requetes drop constraint if exists requetes_statut_check;
alter table requetes add constraint requetes_statut_check
  check (statut in ('ouverte', 'ajoutee', 'validee'));
alter table requetes add column if not exists valide_par uuid references profils on delete set null;
alter table requetes add column if not exists points integer not null default 1;
alter table requetes drop constraint if exists requetes_points_check;
alter table requetes add constraint requetes_points_check check (points > 0);

-- ---------------------------------------------------------------- boutique
-- Chacun·e tient sa propre boutique de récompenses (prix en points, photo
-- facultative) ; le/la partenaire y puise avec les points gagnés en validant
-- des requêtes. L'achat est encore à sens unique : les points sont dépensés,
-- rien n'est automatiquement « livré » — c'est à la personne de tenir sa
-- promesse, l'app ne fait que suivre le compteur et l'historique.

create table if not exists boutique_articles (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples on delete cascade,
  proprietaire uuid not null references profils on delete cascade,
  titre        text not null,
  description  text default '',
  prix         integer not null check (prix > 0),
  image_url    text,
  actif        boolean not null default true,
  cree_le      timestamptz default now()
);

create index if not exists boutique_articles_couple_idx on boutique_articles (couple_id);

create table if not exists boutique_achats (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples on delete cascade,
  article_id uuid references boutique_articles on delete set null,
  acheteur   uuid not null references profils on delete cascade,
  -- Copie du titre/prix au moment de l'achat : l'article peut être modifié
  -- ou retiré ensuite sans que l'historique ne change de sens.
  titre      text not null,
  prix       integer not null,
  cree_le    timestamptz default now()
);

create index if not exists boutique_achats_couple_idx on boutique_achats (couple_id, cree_le desc);

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

-- Incrément atomique, toujours sur ses propres points (auth.uid()) : un
-- update direct depuis le client risquerait une valeur obsolète si les deux
-- s'y mettent en même temps.
create or replace function incrementer_points(delta integer)
returns void
language sql
security definer
set search_path = public
as $$ update profils set points = points + delta where id = auth.uid() $$;

-- Achat atomique : vérifie l'article, le solde, décrémente les points et
-- journalise, le tout dans la même transaction pour qu'il n'y ait jamais de
-- décompte sans achat enregistré (ou l'inverse). security definer parce que
-- le solde d'un autre profil (vérifié : son propre profil, jamais écrit en
-- dehors de cette fonction) et la table boutique_achats ne doivent pas être
-- modifiables autrement que par ce chemin contrôlé.
create or replace function acheter_article(id_article uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_article boutique_articles%rowtype;
  v_points  integer;
begin
  select * into v_article from boutique_articles where id = id_article and actif = true;
  if not found then
    raise exception 'article introuvable';
  end if;
  if v_article.couple_id <> mon_couple() then
    raise exception 'article hors de votre couple';
  end if;
  if v_article.proprietaire = auth.uid() then
    raise exception 'achat de son propre article interdit';
  end if;

  select points into v_points from profils where id = auth.uid();
  if v_points < v_article.prix then
    raise exception 'points insuffisants';
  end if;

  update profils set points = points - v_article.prix where id = auth.uid();
  insert into boutique_achats (couple_id, article_id, acheteur, titre, prix)
  values (v_article.couple_id, v_article.id, auth.uid(), v_article.titre, v_article.prix);
end $$;

drop trigger if exists items_remplir_couple on items;
create trigger items_remplir_couple before insert on items
for each row execute function remplir_couple();

drop trigger if exists requetes_remplir_couple on requetes;
create trigger requetes_remplir_couple before insert on requetes
for each row execute function remplir_couple();

drop trigger if exists humeurs_perso_remplir_couple on humeurs_perso;
create trigger humeurs_perso_remplir_couple before insert on humeurs_perso
for each row execute function remplir_couple();

drop trigger if exists boutique_articles_remplir_couple on boutique_articles;
create trigger boutique_articles_remplir_couple before insert on boutique_articles
for each row execute function remplir_couple();

-- ------------------------------------------------------- règles de partage

alter table couples           enable row level security;
alter table profils           enable row level security;
alter table items             enable row level security;
alter table requetes          enable row level security;
alter table boutique_articles enable row level security;
alter table boutique_achats   enable row level security;
alter table humeurs_perso     enable row level security;

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

drop policy if exists humeurs_perso_lecture on humeurs_perso;
create policy humeurs_perso_lecture on humeurs_perso for select using (couple_id = mon_couple());

drop policy if exists humeurs_perso_creation on humeurs_perso;
create policy humeurs_perso_creation on humeurs_perso for insert with check (couple_id = mon_couple());

drop policy if exists boutique_articles_lecture on boutique_articles;
create policy boutique_articles_lecture on boutique_articles for select using (couple_id = mon_couple());

drop policy if exists boutique_articles_creation on boutique_articles;
create policy boutique_articles_creation on boutique_articles for insert
  with check (couple_id = mon_couple() and proprietaire = auth.uid());

drop policy if exists boutique_articles_maj on boutique_articles;
create policy boutique_articles_maj on boutique_articles for update using (proprietaire = auth.uid());

drop policy if exists boutique_articles_suppression on boutique_articles;
create policy boutique_articles_suppression on boutique_articles for delete using (proprietaire = auth.uid());

-- Pas de policy insert : seule la fonction acheter_article (security
-- definer, donc hors RLS) peut écrire ici — jamais le client directement.
drop policy if exists boutique_achats_lecture on boutique_achats;
create policy boutique_achats_lecture on boutique_achats for select using (couple_id = mon_couple());

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

-- ------------------------------------------------------ notifications push
-- L'app appelle l'Edge Function `notifier-partenaire` juste après chaque
-- action (pas de déclencheur SQL ici : plus simple, et le client sait déjà
-- précisément qui a fait quoi, pas besoin de deviner depuis un diff de ligne).

create table if not exists push_subscriptions (
  id        uuid primary key default gen_random_uuid(),
  profil_id uuid not null references profils on delete cascade,
  endpoint  text not null unique,
  p256dh    text not null,
  auth      text not null,
  cree_le   timestamptz default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists push_subscriptions_lecture on push_subscriptions;
create policy push_subscriptions_lecture on push_subscriptions for select
  using (profil_id = auth.uid());

drop policy if exists push_subscriptions_ecriture on push_subscriptions;
create policy push_subscriptions_ecriture on push_subscriptions for insert
  with check (profil_id = auth.uid());

drop policy if exists push_subscriptions_maj on push_subscriptions;
create policy push_subscriptions_maj on push_subscriptions for update
  using (profil_id = auth.uid());

drop policy if exists push_subscriptions_suppression on push_subscriptions;
create policy push_subscriptions_suppression on push_subscriptions for delete
  using (profil_id = auth.uid());

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
