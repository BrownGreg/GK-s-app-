// Outil de dev UNIQUEMENT : génère un lien de connexion sans envoyer d'email,
// donc sans jamais déclencher la limite de débit de Supabase.
//
// Usage :
//   node --env-file=.env scripts/lien-dev.js vous@email.fr [http://localhost:5173]
//
// Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env (jamais préfixé VITE_, donc
// jamais exposé au bundle client — voir le README pour où la trouver).
//
// Ce script n'est jamais importé par l'app : il ne tourne que si on l'appelle
// explicitement avec `node`, à la main, en local.

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
const redirectTo = process.argv[3] || 'http://localhost:5173'
if (!email) {
  console.error('Usage : node --env-file=.env scripts/lien-dev.js vous@email.fr [http://localhost:5173]')
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

const { data, error } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo }
})

if (error) {
  console.error('Erreur :', error.message)
  process.exit(1)
}

console.log('\nLien de connexion (ouvrez-le dans le navigateur où tourne npm run dev) :\n')
console.log(data.properties.action_link)
console.log()
