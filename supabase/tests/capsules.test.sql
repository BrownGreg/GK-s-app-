-- Tests pgTAP des capsules temporelles : le texte d'une capsule scellée ne
-- doit jamais être lisible par le/la destinataire avant la date, même en
-- interrogeant la table directement. Lancer avec `supabase test db --local`.
--
-- Même convention que boutique_requetes.test.sql : `request.jwt.claim.sub`
-- simule l'utilisateur, `set role authenticated` active la RLS.

begin;
create extension if not exists pgtap;

select plan(17);

-- ------------------------------------------------------------- fixtures

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'), -- Greg
  ('22222222-2222-2222-2222-222222222222'), -- Kim
  ('99999999-9999-9999-9999-999999999999'); -- Sam, couple différent

insert into couples (id, code_invitation) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TESTAA'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TESTBB');

insert into profils (id, prenom, couple_id) values
  ('11111111-1111-1111-1111-111111111111', 'Greg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'Kim', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('99999999-9999-9999-9999-999999999999', 'Sam', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Greg écrit à Kim : une capsule scellée, une surprise (toutes deux dans le futur).
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
insert into capsules (id, texte, ouvre_le) values
  ('cafe0001-0000-0000-0000-000000000000', 'Scellée', now() + interval '30 days');
insert into capsules (id, texte, ouvre_le, surprise) values
  ('cafe0002-0000-0000-0000-000000000000', 'Surprise', now() + interval '30 days', true);
reset role;

-- Une capsule déjà ouverte (date passée) : posée en superuser, puisque la
-- règle d'insertion interdit (à raison) une date dans le passé.
insert into capsules (id, couple_id, auteur, destinataire, texte, ouvre_le, cree_le) values
  ('cafe0003-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'Ouverte', now() - interval '1 day', now() - interval '60 days');

select is(
  (select destinataire from capsules where id = 'cafe0001-0000-0000-0000-000000000000'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'le/la destinataire est déduit·e côté serveur : le/la partenaire'
);

-- ------------------------------------------- lecture par la destinataire

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;

select is(
  (select count(*)::int from capsules where id = 'cafe0001-0000-0000-0000-000000000000'),
  0,
  'une capsule scellée est invisible dans la table pour la destinataire (texte inaccessible)'
);

select is(
  (select texte from capsules where id = 'cafe0003-0000-0000-0000-000000000000'),
  'Ouverte',
  'une capsule dont la date est passée est lisible par la destinataire'
);

select is(
  (select array_agg(id::text) from capsules_scellees()),
  array['cafe0001-0000-0000-0000-000000000000'],
  'capsules_scellees() annonce la capsule scellée, mais pas la surprise'
);

select throws_ok(
  $$ select ouvrir_capsule('cafe0001-0000-0000-0000-000000000000') $$,
  'capsule encore scellée',
  'impossible d''ouvrir une capsule avant sa date'
);

select lives_ok(
  $$ select ouvrir_capsule('cafe0003-0000-0000-0000-000000000000') $$,
  'la destinataire ouvre une capsule arrivée à échéance'
);

-- Pas de policy update : un update direct ne touche aucune ligne.
update capsules set ouvre_le = now() - interval '1 day' where id = 'cafe0001-0000-0000-0000-000000000000';
update capsules set texte = 'Modifié' where id = 'cafe0003-0000-0000-0000-000000000000';

select throws_ok(
  $$ insert into capsules (texte, ouvre_le) values ('Trop tôt', now() - interval '1 minute') $$,
  '42501',
  null,
  'une capsule ne peut pas être créée avec une date déjà passée'
);

select throws_ok(
  $$ insert into capsules (texte, ouvre_le, destinataire) values ('À moi', now() + interval '1 day', '22222222-2222-2222-2222-222222222222') $$,
  '42501',
  null,
  'pas de capsule à soi-même'
);

reset role;

select ok(
  (select lue_le is not null from capsules where id = 'cafe0003-0000-0000-0000-000000000000'),
  'ouvrir_capsule marque la capsule comme lue'
);

select is(
  (select ouvre_le > now() from capsules where id = 'cafe0001-0000-0000-0000-000000000000'),
  true,
  'la destinataire ne peut pas avancer la date d''ouverture'
);

select is(
  (select texte from capsules where id = 'cafe0003-0000-0000-0000-000000000000'),
  'Ouverte',
  'le texte d''une capsule est figé'
);

-- ---------------------------------------------- suppression, autre couple

-- La destinataire ne peut pas supprimer une capsule qui ne vient pas d'elle.
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
delete from capsules where id = 'cafe0001-0000-0000-0000-000000000000';
reset role;

select is(
  (select count(*)::int from capsules where id = 'cafe0001-0000-0000-0000-000000000000'),
  1,
  'la destinataire ne peut pas supprimer la capsule'
);

-- Sam (autre couple) ne voit rien et ne peut rien ouvrir.
set local request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
set role authenticated;

select is(
  (select count(*)::int from capsules),
  0,
  'aucune capsule visible depuis un autre couple'
);

select throws_ok(
  $$ select ouvrir_capsule('cafe0003-0000-0000-0000-000000000000') $$,
  'capsule introuvable',
  'impossible d''ouvrir la capsule d''un autre couple'
);
reset role;

-- L'auteur voit ses capsules (texte compris), peut retirer une scellée, pas une ouverte.
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;

select is(
  (select count(*)::int from capsules),
  3,
  'l''auteur voit toutes ses capsules, scellées comprises'
);

delete from capsules where id = 'cafe0001-0000-0000-0000-000000000000';
delete from capsules where id = 'cafe0003-0000-0000-0000-000000000000';
reset role;

select is(
  (select count(*)::int from capsules where id = 'cafe0001-0000-0000-0000-000000000000'),
  0,
  'l''auteur peut retirer une capsule encore scellée'
);

select is(
  (select count(*)::int from capsules where id = 'cafe0003-0000-0000-0000-000000000000'),
  1,
  'une capsule déjà ouverte ne peut plus être retirée'
);

select * from finish();
rollback;
