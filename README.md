# Nos envies

Application web installable (PWA) pour tracer à deux les dates faites et les envies à venir : une carte, une liste partagée, une to-do, et une fiche souvenir avec note, commentaire et photos.

Aucun coût : pas de store, pas de clé Google Maps, hébergement et base sur des paliers gratuits.

## Démarrer en une minute

```bash
npm install
npm run dev
```

Sans configuration, l'app tourne en **mode local** : tout est stocké sur cet appareil, rien n'est partagé. C'est suffisant pour valider l'ergonomie.

## Activer le partage à deux

1. Créer un projet gratuit sur [supabase.com](https://supabase.com).
2. Ouvrir l'éditeur SQL et exécuter tout le contenu de `supabase/schema.sql`. Il crée les tables, les règles de partage, le temps réel et le bucket photos.
3. Copier `.env.example` vers `.env` et renseigner les deux valeurs (Project Settings → API) :

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

4. Relancer `npm run dev`. La connexion se fait par lien envoyé par email, sans mot de passe.
5. La première personne crée l'espace et récupère un code à 6 caractères. La seconde saisit ce code à l'inscription. À partir de là, tout est commun et se synchronise en direct.

### Se connecter sans attendre l'email (dev uniquement)

Le service d'email intégré de Supabase limite le nombre de liens envoyés par heure — gênant en phase de test. Pour l'éviter :

1. Dans Supabase → *Project Settings → API*, copier la clé **service_role** (différente de la clé publique) et l'ajouter à `.env` :
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
   Cette clé a accès à tout sans restriction : elle ne doit **jamais** être utilisée côté client, jamais préfixée `VITE_`, jamais commitée (`.env` est déjà ignoré par git).
2. Lancer :
   ```bash
   npm run lien-dev -- vous@email.fr
   ```
3. Ouvrir le lien affiché dans le navigateur où tourne `npm run dev` — connexion immédiate, sans email, sans limite.

## Mettre en ligne et installer sur les téléphones

```bash
npm run build
```

Déposer le dossier sur Vercel ou Netlify (import du dépôt Git, palier gratuit). Penser à recopier les deux variables d'environnement dans les réglages de l'hébergeur.

Ensuite, sur chaque téléphone :

- **iPhone** : ouvrir l'URL dans Safari, bouton Partager, « Sur l'écran d'accueil ». Cette étape est obligatoire, y compris pour que les notifications fonctionnent plus tard.
- **Android** : ouvrir l'URL dans Chrome, menu, « Installer l'application ».

## Comment c'est organisé

```
src/
  lib/store.js        Couche de données : Supabase, ou repli local si non configuré
  lib/supabase.js     Client, actif seulement si les variables existent
  screens/            Carte, Liste, À faire, Connexion
  components/         Cartes d'envie, barre d'onglets, panneaux bas
supabase/schema.sql   Tables et règles de partage
```

Deux principes structurent le code :

**Le lieu est facultatif.** Les champs `lat` et `lng` sont nullables, la carte n'affiche que les envies qui en ont. C'est ce qui permet à « flan coco maison » de vivre dans la liste sans polluer la carte.

**Le partage est une règle de base, pas du code applicatif.** Chaque ligne porte un `couple_id`, et quatre règles SQL suffisent à garantir que personne ne voit les envies d'un autre couple. Le client n'a aucune permission à gérer.

Les photos sont stockées comme un tableau d'URL sur l'item plutôt que dans une table dédiée : à cette échelle, une table séparée n'apporterait rien.

## Ce qui reste à faire

- **Notifications push.** La brique la plus fragile, volontairement gardée pour la fin. Le badge « à faire » de la barre d'onglets couvre déjà l'essentiel du besoin.
- **Vue galerie** des souvenirs, en grille de photos plutôt qu'en liste.
- **File d'attente hors-ligne.** Le cache permet aujourd'hui de consulter sans réseau ; les modifications faites hors connexion ne sont pas encore rejouées.
- **Étiquettes personnalisées**, en plus de la liste suggérée.
