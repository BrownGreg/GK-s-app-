// Outil de dev UNIQUEMENT : définit (ou change) le mot de passe d'un compte
// existant directement via l'API admin, sans passer par un email.
//
// Usage :
//   node --env-file=.env scripts/definir-mdp-dev.js vous@email.fr "VotreNouveauMotDePasse"
//
// Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env (jamais préfixé VITE_, donc
// jamais exposé au bundle client — voir le README pour où la trouver).
//
// Ce script n'est jamais importé par l'app : il ne tourne que si on l'appelle
// explicitement avec `node`, à la main, en local.

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
const motDePasse = process.argv[3]
if (!email || !motDePasse) {
  console.error('Usage : node --env-file=.env scripts/definir-mdp-dev.js vous@email.fr "VotreNouveauMotDePasse"')
  process.exit(1)
}

const url = process.env.VITE_SUPABASE_URL
const cleService = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !cleService) {
  console.error(
    'Il manque VITE_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY dans .env.\n' +
    'La clé service_role se trouve dans Supabase → Project Settings → API → Project API keys.'
  )
  process.exit(1)
}

const admin = createClient(url, cleService)

// L'API admin n'a pas de "getUserByEmail" direct : on liste les comptes et on
// filtre nous-mêmes (sans risque ici, un couple = deux comptes au total).
let utilisateur = null
for (let page = 1; !utilisateur; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) {
    console.error('Erreur :', error.message)
    process.exit(1)
  }
  utilisateur = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (data.users.length < 200) break // dernière page
}

if (!utilisateur) {
  console.error(`Aucun compte trouvé pour ${email}.`)
  process.exit(1)
}

const { error: erreurMaj } = await admin.auth.admin.updateUserById(utilisateur.id, {
  password: motDePasse
})

if (erreurMaj) {
  console.error('Erreur :', erreurMaj.message)
  process.exit(1)
}

console.log(`\nMot de passe défini pour ${email}. Vous pouvez maintenant vous connecter avec email + mot de passe.\n`)
