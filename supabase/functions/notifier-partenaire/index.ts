// Edge Function appelée par le client juste après qu'un utilisateur ajoute
// une envie, écrit un commentaire/une note, ajoute une photo, ou envoie une
// demande. Elle retrouve le/la partenaire du couple et lui envoie une vraie
// notification push (même app fermée), signée avec les clés VAPID.
//
// Déploiement : voir le README, section « Notifications push ».

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const utilisateur = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user } } = await utilisateur.auth.getUser()
    if (!user) return new Response('unauthorized', { status: 401 })

    const { titre, corps } = await req.json()
    if (!titre) return new Response('titre manquant', { status: 400 })

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: profil } = await admin
      .from('profils').select('couple_id').eq('id', user.id).maybeSingle()
    if (!profil?.couple_id) return new Response('pas de couple', { status: 200 })

    const { data: partenaire } = await admin
      .from('profils').select('id').eq('couple_id', profil.couple_id).neq('id', user.id).maybeSingle()
    if (!partenaire) return new Response('pas de partenaire', { status: 200 })

    const { data: abonnements } = await admin
      .from('push_subscriptions').select('*').eq('profil_id', partenaire.id)

    await Promise.all((abonnements || []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ titre, corps, url: '/' })
        )
      } catch (err) {
        // Abonnement expiré ou révoqué côté navigateur : on le retire.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }))

    return new Response('ok', { status: 200 })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
