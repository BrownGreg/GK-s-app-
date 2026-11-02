# Changelog

## 2026-11-02 — Capsules temporelles

Depuis l'onglet **Demandes**, une nouvelle entrée « Capsules temporelles »
permet d'écrire un message au/à la partenaire qui ne pourra être lu qu'à
une date choisie (raccourcis 1 mois / 6 mois / 1 an, ou date et heure
précises).

- **Scellée** (par défaut) : le/la destinataire voit qu'une capsule
  l'attend et dans combien de temps elle s'ouvre, sans pouvoir la lire.
- **Surprise** : il/elle ne sait même pas qu'elle existe avant la date.
- Une fois la date passée, la capsule apparaît comme « Nouvelle » (badge
  sur l'onglet Demandes). L'auteur·e voit quand elle a été lue.
- Une capsule ne peut plus être modifiée une fois scellée ; l'auteur·e
  peut seulement la retirer tant qu'elle n'est pas ouverte.

Le verrou est tenu par la base (RLS + heure du serveur) : le texte d'une
capsule scellée n'est jamais envoyé au téléphone du/de la destinataire,
changer l'heure de l'appareil ne débloque rien. Couvert par
`supabase/tests/capsules.test.sql`.

Notifications : à la création (sauf surprise) et à la lecture. Pas encore
de notification push au moment exact de l'ouverture si l'app est fermée :
la capsule apparaît à la prochaine ouverture de l'app.

**Migration requise** : réexécuter `supabase/schema.sql` dans l'éditeur SQL
de Supabase (table `capsules`, fonctions `capsules_scellees` et
`ouvrir_capsule`).

## 2026-10-05 — Tri, date à la création, humeur du jour, outil de dev

### Tri dans l'onglet "À faire"

Un sélecteur **Date / Type** apparaît en haut de l'écran dès qu'il y a des
envies en attente.
- **Date** : garde les envies planifiées triées chronologiquement
  ("Prochainement"), puis celles sans date en dessous ("Sans date").
- **Type** : regroupe toutes les envies par catégorie (Lieu, Activité,
  Resto, Café, Bar), qu'elles aient une date ou non.

### Date dès la création d'une envie

Le champ "Prévue pour" est maintenant disponible directement dans le
formulaire d'ajout (pour les sorties, pas pour la wishlist). Plus besoin de
créer l'envie puis de rouvrir sa fiche juste pour lui donner une date — tout
se fait en une seule étape. La date de fin et la modification restent
accessibles depuis la fiche, comme avant.

### Humeur du jour

Nouvelle section dans le panneau Profil : 8 émojis au choix (😊 😍 😌 😴 🤒
😤 😢 🥳), enregistrés avec la date du jour. Une fois reliés, chacun voit
l'humeur de l'autre juste sous le statut d'appairage. Si elle date d'un jour
précédent, l'app affiche "Pas encore d'humeur aujourd'hui" plutôt qu'une
humeur périmée.

**Migration requise** : `supabase/schema.sql` doit être réexécuté (colonnes
`humeur` et `humeur_le` ajoutées à `profils`).

### Se connecter sans attendre l'email (outil de dev)

Le service email intégré de Supabase limite strictement le nombre de liens
de connexion envoyés par heure, ce qui devient vite gênant en phase de test.

Nouveau script `scripts/lien-dev.js`, lancé via :

```bash
npm run lien-dev -- vous@email.fr
```

Il utilise la clé `service_role` de Supabase (jamais exposée au client, à
ajouter soi-même dans `.env` sous `SUPABASE_SERVICE_ROLE_KEY`, jamais
préfixée `VITE_`) pour générer un lien de connexion valide sans envoyer
d'email — donc sans jamais déclencher la limite de débit. Ce script n'est
jamais importé par l'app ; aucun risque en production. Détails dans le
[README](README.md#se-connecter-sans-attendre-lemail-dev-uniquement).
