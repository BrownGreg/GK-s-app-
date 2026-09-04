import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Tant que les deux variables ne sont pas renseignées, l'app tourne en local
// sur cet appareil uniquement : rien n'est partagé, mais tout est utilisable.
export const isRemote = Boolean(url && key)

export const supabase = isRemote ? createClient(url, key) : null
