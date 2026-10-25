// Edge Function appelée par l'onglet Assistant : relaie la conversation à
// l'API Kimi (Moonshot AI, compatible OpenAI) derrière un system prompt
// strictement cadré sur les sorties/restos/activités culturelles — jamais
// exposée côté client pour ne pas laisser fuiter la clé ni le budget payant.
//
// Déploiement : voir le README, section « Assistant sorties ».

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const MOONSHOT_API_KEY = Deno.env.get('MOONSHOT_API_KEY')!

const SYSTEM_PROMPT_FR = `Tu es l'assistant sorties de « Nos envies », une application pour un couple.
Ton unique rôle : proposer des idées de sorties, restaurants, activités culturelles ou
rendez-vous romantiques, à partir de ce que l'utilisateur décrit (ambiance, budget, ville,
type de cuisine, envie du moment…).

Règles strictes :
- Ne réponds jamais à une question hors de ce sujet (actualité, code, santé, devoirs,
  etc.) — rappelle poliment ton rôle et recentre la conversation.
- Tu n'as pas accès à Internet en temps réel : ne prétends jamais connaître les horaires,
  prix ou disponibilité actuels d'un lieu précis. Suggère des types de lieux/activités et
  encourage à vérifier les détails avant de s'y rendre.
- Reste concis : 2 à 4 suggestions maximum par réponse, avec une courte raison pour
  chacune.
- Ton chaleureux et complice, jamais présomptueux ni déplacé.`

const SYSTEM_PROMPT_EN = `You are the outings assistant for "Nos envies", a couple's app.
Your only role: suggest outings, restaurants, cultural activities or date ideas based on
what the user describes (mood, budget, city, type of food, what they feel like…).

Strict rules:
- Never answer anything outside this topic (news, code, health, homework, etc.) — politely
  restate your role and steer back.
- You have no real-time internet access: never claim to know a specific place's current
  hours, prices or availability. Suggest types of places/activities and encourage checking
  details before going.
- Stay concise: 2 to 4 suggestions max per reply, each with a short reason.
- Warm, easygoing tone — never presumptuous or inappropriate.`

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const utilisateur = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user } } = await utilisateur.auth.getUser()
    if (!user) return new Response('unauthorized', { status: 401 })

    const { messages, langue } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('messages manquants', { status: 400 })
    }

    // Garde-fou côté coût : on ne renvoie jamais plus que les derniers
    // échanges, et on ignore tout rôle autre que user/assistant envoyé par
    // erreur par le client (le system prompt n'est jamais pris du client).
    const historique = messages
      .filter((m) => m?.role === 'user' || m?.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 2000) }))

    const reponse = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'kimi-k3',
        messages: [
          { role: 'system', content: langue === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR },
          ...historique
        ],
        // kimi-k3 raisonne avant de répondre (reasoning_content, facturé comme
        // tokens de sortie) : une limite trop basse coupe la réponse avant
        // même qu'elle ne commence. Et ce modèle n'accepte que temperature=1
        // (donc on omet le paramètre, pour garder son défaut).
        max_completion_tokens: 1500
      })
    })

    if (!reponse.ok) {
      const texte = await reponse.text()
      return new Response(texte || 'erreur assistant', { status: 502 })
    }

    const json = await reponse.json()
    const contenu = json.choices?.[0]?.message?.content || ''
    return new Response(JSON.stringify({ contenu }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
