-- Tests pgTAP des règles atomiques : achat, validation de requête, cycle de
-- vie d'un bon d'achat. Lancer avec `supabase test db --local`.
--
-- Simule un utilisateur authentifié avec `set local request.jwt.claim.sub`
-- (lu par auth.uid(), voir sa définition) + `set role authenticated` (pour
-- que les policies RLS s'appliquent réellement — connecté en superuser,
-- elles seraient sinon ignorées). `reset role` revient à postgres pour
-- préparer les fixtures suivantes sans contrainte RLS.

begin;
create extension if not exists pgtap;

select plan(21);

-- ------------------------------------------------------------- fixtures

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'), -- Greg
  ('22222222-2222-2222-2222-222222222222'), -- Kim
  ('99999999-9999-9999-9999-999999999999'); -- Sam, couple différent

insert into couples (id, code_invitation) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TESTAA'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TESTBB');

insert into profils (id, prenom, couple_id, points) values
  ('11111111-1111-1111-1111-111111111111', 'Greg', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10),
  ('22222222-2222-2222-2222-222222222222', 'Kim', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3),
  ('99999999-9999-9999-9999-999999999999', 'Sam', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 50);

-- Greg crée deux articles : un répétable (3 pts), un non répétable (4 pts).
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
insert into boutique_articles (id, proprietaire, titre, prix, repetable) values
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Café', 3, true),
  ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Massage', 4, false);
reset role;

-- Sam (autre couple) crée aussi un article, pour le test cross-couple.
set local request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
set role authenticated;
insert into boutique_articles (id, proprietaire, titre, prix) values
  ('c3333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', 'Hors couple', 1);
reset role;

-- ----------------------------------------------- achat : cas nominal

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select acheter_article('c1111111-1111-1111-1111-111111111111');
reset role;

select is(
  (select points from profils where id = '22222222-2222-2222-2222-222222222222'),
  0::int,
  'achat valide : le solde est débité du prix exact (3 -> 0)'
);

select is(
  (select statut::text from boutique_achats where article_id = 'c1111111-1111-1111-1111-111111111111'),
  'ready',
  'achat valide : le bon créé est au statut ready'
);

select is(
  (select vendeur from boutique_achats where article_id = 'c1111111-1111-1111-1111-111111111111'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'achat valide : le vendeur snapshotté est le propriétaire de l''article'
);

select is(
  (select count(*)::int from points_transactions where profil_id = '22222222-2222-2222-2222-222222222222' and raison = 'achat'),
  1,
  'achat valide : une ligne de journal "achat" est écrite'
);

-- ----------------------------------------------- achat : solde insuffisant
-- Kim a 0 point à ce stade (elle vient de dépenser son solde sur le café) :
-- tenter d'acheter le massage à 4 pts doit échouer.

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select throws_ok(
  $$ select acheter_article('c2222222-2222-2222-2222-222222222222') $$,
  'points insuffisants',
  'achat refusé avec un solde insuffisant (erreur attendue)'
);
reset role;

-- Le solde n'a pas bougé malgré l'échec.
select is(
  (select points from profils where id = '22222222-2222-2222-2222-222222222222'),
  0::int,
  'achat refusé : le solde n''a pas été débité'
);

-- Redonne des points à Kim pour la suite des tests.
update profils set points = 20 where id = '22222222-2222-2222-2222-222222222222';

-- ----------------------------------------------- achat : auto-achat interdit

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select throws_ok(
  $$ select acheter_article('c2222222-2222-2222-2222-222222222222') $$,
  'achat de son propre article interdit',
  'achat de son propre article refusé'
);
reset role;

-- ----------------------------------------------- achat : hors couple

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select throws_ok(
  $$ select acheter_article('c3333333-3333-3333-3333-333333333333') $$,
  'article hors de votre couple',
  'achat d''un article d''un autre couple refusé'
);
reset role;

-- ----------------------------------------------- article non répétable

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select acheter_article('c2222222-2222-2222-2222-222222222222'); -- 4 pts, Kim a 20
reset role;

select is(
  (select actif from boutique_articles where id = 'c2222222-2222-2222-2222-222222222222'),
  false,
  'article non répétable : passé hors-vente (actif=false) après un achat'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select throws_ok(
  $$ select acheter_article('c2222222-2222-2222-2222-222222222222') $$,
  'article introuvable',
  'double achat d''un article non répétable (déjà hors-vente) refusé — protège aussi du double-tap'
);
reset role;

-- ----------------------------------------------- validation de requête

insert into requetes (id, couple_id, demande_par, texte, points) values
  ('d1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Sortir les poubelles', 2);

-- Greg (l'auteur) ne peut pas valider sa propre demande.
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select throws_ok(
  $$ select valider_requete('d1111111-1111-1111-1111-111111111111') $$,
  'validation de sa propre demande interdite',
  'auto-validation d''une requête refusée'
);
reset role;

-- Kim (destinataire) peut valider et touche les points définis par Greg (2).
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select valider_requete('d1111111-1111-1111-1111-111111111111');
reset role;

select is(
  (select points from profils where id = '22222222-2222-2222-2222-222222222222'),
  18::int,
  'validation : Kim gagne exactement les 2 points définis par Greg (20 -> 18 après l''achat précédent)'
);

select is(
  (select statut::text from requetes where id = 'd1111111-1111-1111-1111-111111111111'),
  'validee',
  'validation : la requête passe au statut validee'
);

select is(
  (select valide_par from requetes where id = 'd1111111-1111-1111-1111-111111111111'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'validation : valide_par est bien le/la destinataire'
);

-- Une requête déjà traitée ne peut pas être validée une seconde fois.
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select throws_ok(
  $$ select valider_requete('d1111111-1111-1111-1111-111111111111') $$,
  'requête déjà traitée',
  'double validation de la même requête refusée'
);
reset role;

-- Un update direct du statut (sans passer par valider_requete) est bloqué
-- par la policy RLS — même pour la bonne personne, même en contournant la
-- fonction : c'est le vrai correctif du bug d'auto-validation.
insert into requetes (id, couple_id, demande_par, texte, points) values
  ('d2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Arroser les plantes', 1);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select throws_like(
  $$ update requetes set statut = 'validee', valide_par = '22222222-2222-2222-2222-222222222222' where id = 'd2222222-2222-2222-2222-222222222222' $$,
  '%row-level security policy%',
  'un update direct (hors fonction) ne peut jamais poser statut=validee'
);
reset role;

-- ----------------------------------------------- cycle réclamer / honorer

-- Kim réclame son achat de café (toujours "ready" à ce stade).
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select reclamer_achat(id) from boutique_achats where article_id = 'c1111111-1111-1111-1111-111111111111';
reset role;

select is(
  (select statut::text from boutique_achats where article_id = 'c1111111-1111-1111-1111-111111111111'),
  'claimed',
  'réclamation : le bon passe à claimed'
);

-- Greg (le vendeur) ne peut pas réclamer à la place de Kim.
insert into boutique_articles (id, proprietaire, titre, prix) values
  ('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Dîner', 2);
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select acheter_article('c4444444-4444-4444-4444-444444444444');
reset role;

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select throws_ok(
  $$ select reclamer_achat(id) from boutique_achats where article_id = 'c4444444-4444-4444-4444-444444444444' $$,
  'achat introuvable',
  'le vendeur ne peut pas réclamer un bon à la place de l''acheteur'
);
reset role;

-- Greg (vendeur) honore le bon de café, maintenant que Kim l'a réclamé.
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select honorer_achat(id) from boutique_achats where article_id = 'c1111111-1111-1111-1111-111111111111';
reset role;

select is(
  (select statut::text from boutique_achats where article_id = 'c1111111-1111-1111-1111-111111111111'),
  'honored',
  'confirmation : le bon réclamé passe à honored'
);

-- On ne peut pas honorer un bon pas encore réclamé (toujours "ready").
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select throws_ok(
  $$ select honorer_achat(id) from boutique_achats where article_id = 'c4444444-4444-4444-4444-444444444444' $$,
  'achat pas encore réclamé',
  'un bon pas encore réclamé ne peut pas être honoré directement'
);
reset role;

-- Kim ne peut pas honorer son propre achat (rôle réservé au vendeur).
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select reclamer_achat(id) from boutique_achats where article_id = 'c4444444-4444-4444-4444-444444444444';
select throws_ok(
  $$ select honorer_achat(id) from boutique_achats where article_id = 'c4444444-4444-4444-4444-444444444444' $$,
  'achat introuvable',
  'l''acheteur ne peut pas honorer son propre bon (rôle réservé au vendeur)'
);
reset role;

select * from finish();
rollback;
