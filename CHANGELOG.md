# Changelog

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
