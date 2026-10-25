import { supabase, isRemote } from './supabase'

// Les libellés vivent dans le dictionnaire i18n (clé "type_<id>") : ce qui est
// stocké sur l'item (item.type) est l'id, indépendant de la langue affichée.
export const TYPES = {
  lieu: { dot: 'dot--lieu' },
  activite: { dot: 'dot--activite' },
  resto: { dot: 'dot--resto' },
  cafe: { dot: 'dot--cafe' },
  bar: { dot: 'dot--bar' },
  nourriture: { dot: 'dot--nourriture' },
  media: { dot: 'dot--media' },
  objet: { dot: 'dot--objet' },
  autre: { dot: 'dot--autre' }
}

// Sorties à deux (avec lieu/carte) vs souhaits persos (nourriture, média,
// objet à acheter…) : deux sous-ensembles de types, un onglet chacun.
export const TYPES_SORTIE = ['lieu', 'activite', 'resto', 'cafe', 'bar']
export const TYPES_SOUHAIT = ['nourriture', 'media', 'objet', 'autre']

// Moyenne des notes laissées par chacun — non arrondie, pour trier correctement
// (arrondir seulement à l'affichage des étoiles).
export function moyenneNote(item) {
  const notes = Object.values(item.avis || {}).map((a) => a.note).filter(Boolean)
  return notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : 0
}

export const TAGS_SUGGERES = [
  'musée', 'bar', 'café', 'balade', 'cuisine maison', 'soirée maison', 'concert',
  'cinéma', 'sport', 'brunch', 'week-end', 'voyage', 'exposition',
  'food', 'restaurant', 'festival', 'soirée'
]

// Humeurs prédéfinies : un id stable (stocké tel quel sur le profil), un
// libellé traduit (clé i18n) et une couleur. Les humeurs perso ajoutées par
// le couple (table humeurs_perso) viennent s'ajouter à cette liste de base.
export const HUMEURS_BASE = [
  { id: 'bien', labelKey: 'humeur_bien', couleur: '#C89B3C' },
  { id: 'amoureux', labelKey: 'humeur_amoureux', couleur: '#E2574C' },
  { id: 'serein', labelKey: 'humeur_serein', couleur: '#2E7D6F' },
  { id: 'fatigue', labelKey: 'humeur_fatigue', couleur: '#6B7AA1' },
  { id: 'pensif', labelKey: 'humeur_pensif', couleur: '#8B5D8F' },
  { id: 'agace', labelKey: 'humeur_agace', couleur: '#C17A4E' },
  { id: 'triste', labelKey: 'humeur_triste', couleur: '#4A7FC1' },
  { id: 'festif', labelKey: 'humeur_festif', couleur: '#D66FA0' }
]

// Résout un id d'humeur (prédéfinie ou perso) vers { label, couleur }, ou
// null si l'id ne correspond à rien (humeur supprimée depuis, par ex.).
export function resoudreHumeur(id, t, humeursPerso = []) {
  if (!id) return null
  const base = HUMEURS_BASE.find((h) => h.id === id)
  if (base) return { label: t(base.labelKey), couleur: base.couleur }
  const perso = humeursPerso.find((h) => h.id === id)
  return perso ? { label: perso.label, couleur: perso.couleur } : null
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))
const codeAleatoire = () => Math.random().toString(36).slice(2, 8).toUpperCase()

// L'API Push attend la clé VAPID en Uint8Array, pas en base64url brut.
function versUint8Array(base64url) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const brut = atob(base64)
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)))
}

/* ------------------------------------------------------------------ */
/* Mode local : une seule personne, un seul appareil, aucun partage.    */
/* ------------------------------------------------------------------ */

const LS = {
  read(cle, defaut) {
    try { return JSON.parse(localStorage.getItem(cle)) ?? defaut } catch { return defaut }
  },
  write(cle, valeur) { localStorage.setItem(cle, JSON.stringify(valeur)) }
}

const localStore = {
  async profil() {
    return LS.read('envies:profil', null)
  },
  async connecter(prenom) {
    const profil = { id: uid(), prenom, couple_id: uid(), code_invitation: codeAleatoire(), phrase_perso: '', avatar_url: '' }
    LS.write('envies:profil', profil)
    return profil
  },
  async deconnecter() { localStorage.removeItem('envies:profil') },
  async majPhrase(phrase) {
    const profil = LS.read('envies:profil', null)
    if (profil) { profil.phrase_perso = phrase; LS.write('envies:profil', profil) }
  },
  async majAvatar(dataUrl) {
    const profil = LS.read('envies:profil', null)
    if (profil) { profil.avatar_url = dataUrl; LS.write('envies:profil', profil) }
    return dataUrl
  },
  async majPrenom(prenom) {
    const profil = LS.read('envies:profil', null)
    if (profil) { profil.prenom = prenom; LS.write('envies:profil', profil) }
  },
  async majHumeur(humeur, image) {
    const profil = LS.read('envies:profil', null)
    if (profil) {
      profil.humeur = humeur
      profil.humeur_le = new Date().toISOString().slice(0, 10)
      profil.humeur_image_url = image || null
      LS.write('envies:profil', profil)
    }
  },
  async humeursPerso() {
    return LS.read('envies:humeurs_perso', [])
  },
  async ajouterHumeurPerso(label, couleur) {
    const liste = LS.read('envies:humeurs_perso', [])
    const humeur = { id: uid(), label, couleur }
    liste.push(humeur)
    LS.write('envies:humeurs_perso', liste)
    return humeur
  },
  async majMessageJour(message) {
    const profil = LS.read('envies:profil', null)
    if (profil) {
      profil.message_jour = message
      profil.message_jour_le = new Date().toISOString().slice(0, 10)
      LS.write('envies:profil', profil)
    }
  },
  async partenaire() { return null },
  // Mode local : un seul appareil, personne à notifier.
  async envoyerNotification() {},
  async demanderAssistant() { throw new Error('assistant_indisponible') },
  async activerNotifications() { throw new Error('notifications_non_disponibles') },
  async desactiverNotifications() {},
  async statutNotifications() { return 'indisponible' },
  async lister() {
    return LS.read('envies:items', []).sort(trierItems)
  },
  async creer(item) {
    const items = LS.read('envies:items', [])
    const nouveau = { ...item, id: uid(), cree_le: new Date().toISOString() }
    LS.write('envies:items', [nouveau, ...items])
    return nouveau
  },
  async modifier(id, patch) {
    const items = LS.read('envies:items', []).map((i) => (i.id === id ? { ...i, ...patch } : i))
    LS.write('envies:items', items)
    return items.find((i) => i.id === id)
  },
  async supprimer(id) {
    LS.write('envies:items', LS.read('envies:items', []).filter((i) => i.id !== id))
  },
  async ajouterPhoto(itemId, dataUrl) {
    const items = LS.read('envies:items', []).map((i) =>
      i.id === itemId ? { ...i, photos: [...(i.photos || []), dataUrl] } : i
    )
    LS.write('envies:items', items)
    return dataUrl
  },
  async supprimerPhoto(itemId, url) {
    const items = LS.read('envies:items', []).map((i) =>
      i.id === itemId ? { ...i, photos: (i.photos || []).filter((p) => p !== url) } : i
    )
    LS.write('envies:items', items)
  },
  async listerRequetes() {
    return LS.read('envies:requetes', []).sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le))
  },
  async creerRequete(texte, points = 1) {
    const profil = LS.read('envies:profil', null)
    const requetes = LS.read('envies:requetes', [])
    const nouvelle = {
      id: uid(),
      texte,
      points,
      demande_par: profil?.id,
      statut: 'ouverte',
      cree_le: new Date().toISOString()
    }
    LS.write('envies:requetes', [nouvelle, ...requetes])
    return nouvelle
  },
  async marquerRequeteAjoutee(id) {
    const requetes = LS.read('envies:requetes', []).map((r) => (r.id === id ? { ...r, statut: 'ajoutee' } : r))
    LS.write('envies:requetes', requetes)
  },
  async validerRequete(id) {
    const profil = LS.read('envies:profil', null)
    const requetes = LS.read('envies:requetes', [])
    const requete = requetes.find((r) => r.id === id)
    LS.write(
      'envies:requetes',
      requetes.map((r) => (r.id === id ? { ...r, statut: 'validee', valide_par: profil?.id } : r))
    )
    if (profil) { profil.points = (profil.points || 0) + (requete?.points || 1); LS.write('envies:profil', profil) }
  },
  async supprimerRequete(id) {
    LS.write('envies:requetes', LS.read('envies:requetes', []).filter((r) => r.id !== id))
  },
  ecouterRequetes() { return () => {} },

  async listerBoutique() {
    return LS.read('envies:boutique', [])
  },
  async creerArticleBoutique({ titre, description, prix, image }) {
    const profil = LS.read('envies:profil', null)
    const articles = LS.read('envies:boutique', [])
    const nouveau = {
      id: uid(),
      titre,
      description: description || '',
      prix,
      image_url: image || null,
      proprietaire: profil?.id,
      actif: true,
      cree_le: new Date().toISOString()
    }
    LS.write('envies:boutique', [nouveau, ...articles])
    return nouveau
  },
  async supprimerArticleBoutique(id) {
    LS.write('envies:boutique', LS.read('envies:boutique', []).filter((a) => a.id !== id))
  },
  async acheterArticle(id) {
    const profil = LS.read('envies:profil', null)
    const article = LS.read('envies:boutique', []).find((a) => a.id === id)
    if (!article) throw new Error('article_introuvable')
    if (article.proprietaire === profil?.id) throw new Error('achat_propre_article')
    if ((profil?.points || 0) < article.prix) throw new Error('points_insuffisants')
    profil.points -= article.prix
    LS.write('envies:profil', profil)
  },
  async listerAchats() { return [] },

  ecouter() { return () => {} }
}

/* ------------------------------------------------------------------ */
/* Mode partagé : Supabase.                                            */
/* ------------------------------------------------------------------ */

const remoteStore = {
  async profil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('profils')
      .select('id, prenom, avatar_url, humeur, humeur_le, humeur_image_url, message_jour, message_jour_le, points, couple_id, couples(code_invitation, phrase_perso)')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error
    if (!data) return { id: user.id, prenom: '', couple_id: null }
    return {
      id: data.id,
      prenom: data.prenom,
      avatar_url: data.avatar_url || '',
      humeur: data.humeur || '',
      humeur_le: data.humeur_le,
      humeur_image_url: data.humeur_image_url || '',
      message_jour: data.message_jour || '',
      message_jour_le: data.message_jour_le,
      points: data.points || 0,
      couple_id: data.couple_id,
      code_invitation: data.couples?.code_invitation,
      phrase_perso: data.couples?.phrase_perso || ''
    }
  },

  async partenaire(coupleId) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('profils')
      .select('id, prenom, avatar_url, humeur, humeur_le, humeur_image_url, message_jour, message_jour_le, points')
      .eq('couple_id', coupleId)
      .neq('id', user.id)
      .maybeSingle()
    return data || null
  },

  async humeursPerso() {
    const { data, error } = await supabase
      .from('humeurs_perso')
      .select('id, label, couleur')
      .order('cree_le', { ascending: true })
    if (error) throw error
    return data || []
  },

  async ajouterHumeurPerso(label, couleur) {
    const { data, error } = await supabase
      .from('humeurs_perso')
      .insert({ label, couleur })
      .select('id, label, couleur')
      .single()
    if (error) throw error
    return data
  },

  async envoyerLienConnexion(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) throw error
  },

  async inscrireMotDePasse(email, motDePasse) {
    const { error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) throw error
  },

  async connecterMotDePasse(email, motDePasse) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    if (error) throw error
  },

  async connecterGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) throw error
  },

  async deconnecter() { await supabase.auth.signOut() },

  async creerCouple(prenom) {
    const { data: { user } } = await supabase.auth.getUser()
    const code = codeAleatoire()
    const { data: couple, error } = await supabase
      .from('couples')
      .insert({ code_invitation: code })
      .select()
      .single()
    if (error) throw error
    await supabase.from('profils').upsert({ id: user.id, prenom, couple_id: couple.id })
    return couple
  },

  async rejoindreCouple(prenom, code) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .eq('code_invitation', code.trim().toUpperCase())
      .maybeSingle()
    if (!couple) throw new Error('code_invalide')
    await supabase.from('profils').upsert({ id: user.id, prenom, couple_id: couple.id })
    return couple
  },

  async majPhrase(phrase, coupleId) {
    await supabase.from('couples').update({ phrase_perso: phrase }).eq('id', coupleId)
  },

  async majAvatar(dataUrl) {
    const { data: { user } } = await supabase.auth.getUser()
    const blob = await (await fetch(dataUrl)).blob()
    const chemin = `avatars/${user.id}.jpg`
    const { error } = await supabase.storage
      .from('photos')
      .upload(chemin, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('photos').getPublicUrl(chemin)
    // Cache-bust : même chemin qu'avant, sinon le navigateur garde l'ancienne photo.
    const url = `${data.publicUrl}?v=${Date.now()}`
    await supabase.from('profils').update({ avatar_url: url }).eq('id', user.id)
    return url
  },

  async majPrenom(prenom) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profils').update({ prenom }).eq('id', user.id)
  },

  async majHumeur(humeur, image) {
    const { data: { user } } = await supabase.auth.getUser()
    let humeur_image_url = null
    if (image?.startsWith('data:')) {
      // Photo perso : on l'héberge nous-mêmes, comme l'avatar.
      const blob = await (await fetch(image)).blob()
      const chemin = `humeurs/${user.id}.jpg`
      const { error } = await supabase.storage
        .from('photos')
        .upload(chemin, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('photos').getPublicUrl(chemin)
      humeur_image_url = `${data.publicUrl}?v=${Date.now()}`
    } else if (image) {
      // GIF : déjà hébergé par Giphy, pas besoin de le dupliquer.
      humeur_image_url = image
    }
    await supabase
      .from('profils')
      .update({ humeur, humeur_le: new Date().toISOString().slice(0, 10), humeur_image_url })
      .eq('id', user.id)
  },

  async majMessageJour(message) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('profils')
      .update({ message_jour: message, message_jour_le: new Date().toISOString().slice(0, 10) })
      .eq('id', user.id)
  },

  // Best-effort : une notification qui échoue ne doit jamais faire échouer
  // l'action principale (ajout d'envie, commentaire...).
  async envoyerNotification(titre, corps) {
    try { await supabase.functions.invoke('notifier-partenaire', { body: { titre, corps } }) }
    catch { /* pas grave */ }
  },

  async demanderAssistant(messages, langue) {
    const { data, error } = await supabase.functions.invoke('assistant-sorties', { body: { messages, langue } })
    if (error) {
      // Le détail (texte renvoyé par la Function, souvent l'erreur brute de
      // l'API Kimi) atterrit dans error.context : précieux pour déboguer,
      // jamais affiché tel quel à l'utilisateur.
      const detail = await error.context?.text?.().catch(() => null)
      console.error('assistant-sorties a échoué :', error.message, detail)
      throw new Error('assistant_erreur')
    }
    return data.contenu
  },

  async statutNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'indisponible'
    if (Notification.permission === 'denied') return 'refusee'
    const registration = await navigator.serviceWorker.ready
    const abonnement = await registration.pushManager.getSubscription()
    return abonnement ? 'active' : 'inactive'
  },

  async activerNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('notifications_non_disponibles')
    }
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      throw new Error('notifications_non_configurees')
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('notifications_refusees')

    const registration = await navigator.serviceWorker.ready
    let abonnement = await registration.pushManager.getSubscription()
    if (!abonnement) {
      abonnement = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: versUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
      })
    }

    const { data: { user } } = await supabase.auth.getUser()
    const json = abonnement.toJSON()
    await supabase.from('push_subscriptions').upsert(
      { profil_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: 'endpoint' }
    )
  },

  async desactiverNotifications() {
    const registration = await navigator.serviceWorker.ready
    const abonnement = await registration.pushManager.getSubscription()
    if (abonnement) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', abonnement.endpoint)
      await abonnement.unsubscribe()
    }
  },

  async lister() {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('cree_le', { ascending: false })
    if (error) throw error
    return (data || []).sort(trierItems)
  },

  async creer(item) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('items')
      .insert({ ...item, cree_par: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async modifier(id, patch) {
    const { data, error } = await supabase.from('items').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async supprimer(id) {
    await supabase.from('items').delete().eq('id', id)
  },

  async ajouterPhoto(itemId, dataUrl) {
    const blob = await (await fetch(dataUrl)).blob()
    const chemin = `${itemId}/${uid()}.jpg`
    const { error } = await supabase.storage.from('photos').upload(chemin, blob, { contentType: 'image/jpeg' })
    if (error) throw error
    const { data } = supabase.storage.from('photos').getPublicUrl(chemin)
    const { data: item } = await supabase.from('items').select('photos').eq('id', itemId).single()
    const photos = [...(item?.photos || []), data.publicUrl]
    await supabase.from('items').update({ photos }).eq('id', itemId)
    return data.publicUrl
  },

  async supprimerPhoto(itemId, url) {
    const { data: item } = await supabase.from('items').select('photos').eq('id', itemId).single()
    const photos = (item?.photos || []).filter((p) => p !== url)
    await supabase.from('items').update({ photos }).eq('id', itemId)
    const chemin = url.split('/photos/')[1]
    if (chemin) await supabase.storage.from('photos').remove([chemin])
  },

  ecouter(rappel) {
    const canal = supabase
      .channel('items-partages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, rappel)
      .subscribe()
    return () => supabase.removeChannel(canal)
  },

  async listerRequetes() {
    const { data, error } = await supabase
      .from('requetes')
      .select('*')
      .order('cree_le', { ascending: false })
    if (error) throw error
    return data || []
  },

  async creerRequete(texte, points = 1) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('requetes')
      .insert({ texte, points, demande_par: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async marquerRequeteAjoutee(id) {
    await supabase.from('requetes').update({ statut: 'ajoutee' }).eq('id', id)
  },

  async validerRequete(id, points = 1) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('requetes').update({ statut: 'validee', valide_par: user.id }).eq('id', id)
    const { error } = await supabase.rpc('incrementer_points', { delta: points })
    if (error) throw error
  },

  async supprimerRequete(id) {
    await supabase.from('requetes').delete().eq('id', id)
  },

  async listerBoutique() {
    const { data, error } = await supabase
      .from('boutique_articles')
      .select('*')
      .eq('actif', true)
      .order('cree_le', { ascending: false })
    if (error) throw error
    return data || []
  },

  async creerArticleBoutique({ titre, description, prix, image }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('boutique_articles')
      .insert({ titre, description, prix, proprietaire: user.id })
      .select()
      .single()
    if (error) throw error

    if (image) {
      const blob = await (await fetch(image)).blob()
      const chemin = `boutique/${data.id}.jpg`
      const { error: erreurUpload } = await supabase.storage
        .from('photos')
        .upload(chemin, blob, { contentType: 'image/jpeg', upsert: true })
      if (!erreurUpload) {
        const { data: publicUrl } = supabase.storage.from('photos').getPublicUrl(chemin)
        const image_url = `${publicUrl.publicUrl}?v=${Date.now()}`
        await supabase.from('boutique_articles').update({ image_url }).eq('id', data.id)
        data.image_url = image_url
      }
    }
    return data
  },

  async supprimerArticleBoutique(id) {
    await supabase.from('boutique_articles').delete().eq('id', id)
  },

  async acheterArticle(id) {
    const { error } = await supabase.rpc('acheter_article', { id_article: id })
    if (error) throw error
  },

  async listerAchats() {
    const { data, error } = await supabase
      .from('boutique_achats')
      .select('*')
      .order('cree_le', { ascending: false })
    if (error) throw error
    return data || []
  },

  ecouterRequetes(rappel) {
    const canal = supabase
      .channel('requetes-partagees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requetes' }, rappel)
      .subscribe()
    return () => supabase.removeChannel(canal)
  }
}

/* ------------------------------------------------------------------ */

function trierItems(a, b) {
  if (a.fait !== b.fait) return a.fait ? 1 : -1
  return new Date(b.cree_le) - new Date(a.cree_le)
}

export const store = isRemote ? remoteStore : localStore
export { isRemote }

// HEIC/HEIF (format par défaut des iPhone) n'est décodable ni par <img>/<canvas>
// ni par la plupart des navigateurs non-Safari : on le convertit d'abord en JPEG.
// Import différé : la librairie (wasm) ne pèse que pour qui envoie vraiment du HEIC.
export async function versJPEGSiHEIC(fichier) {
  const estHEIC = fichier.type === 'image/heic' || fichier.type === 'image/heif' || /\.hei[cf]$/i.test(fichier.name)
  if (!estHEIC) return fichier
  const { default: heic2any } = await import('heic2any')
  const converti = await heic2any({ blob: fichier, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(converti) ? converti[0] : converti
  return new File([blob], fichier.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
}

/* Compression avant envoi : sans ça, quelques photos suffisent à saturer
   le palier gratuit de stockage. */
export async function compresserImage(fichier, maxCote = 1400, qualite = 0.82) {
  try {
    fichier = await versJPEGSiHEIC(fichier)
  } catch {
    throw new Error('heic_illisible')
  }
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader()
    lecteur.onerror = () => rejeter(new Error('Lecture du fichier impossible.'))
    lecteur.onload = () => {
      const img = new Image()
      img.onerror = () => rejeter(new Error('Image illisible.'))
      img.onload = () => {
        const ratio = Math.min(1, maxCote / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resoudre(canvas.toDataURL('image/jpeg', qualite))
      }
      img.src = lecteur.result
    }
    lecteur.readAsDataURL(fichier)
  })
}

/* Recherche de lieu — Photon (OpenStreetMap), gratuit et sans clé. */
export async function chercherLieu(requete, centre) {
  const params = new URLSearchParams({ q: requete, lang: 'fr', limit: '6' })
  if (centre) { params.set('lat', centre[1]); params.set('lon', centre[0]) }
  const reponse = await fetch(`https://photon.komoot.io/api/?${params}`)
  if (!reponse.ok) throw new Error('recherche_indisponible')
  const json = await reponse.json()
  return (json.features || []).map((f) => ({
    nom: f.properties.name || f.properties.street || 'Sans nom',
    detail: [f.properties.street, f.properties.city, f.properties.country].filter(Boolean).join(', '),
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1]
  }))
}

/* Export calendrier — fichier .ics standard, ouvert nativement par le
   calendrier du téléphone (iPhone et Android) : pas de compte ni d'API. */

function versICS(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}`
    + `T${p(date.getUTCHours())}${p(date.getUTCMinutes())}00Z`
}

function echapperICS(texte = '') {
  return texte.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

export function telechargerEvenement(item, debut, fin) {
  fin = fin || new Date(debut.getTime() + 60 * 60 * 1000)
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nos envies//FR',
    'BEGIN:VEVENT',
    `UID:${item.id}@nos-envies`,
    `DTSTAMP:${versICS(new Date())}`,
    `DTSTART:${versICS(debut)}`,
    `DTEND:${versICS(fin)}`,
    `SUMMARY:${echapperICS(item.titre)}`,
    item.description ? `DESCRIPTION:${echapperICS(item.description)}` : null,
    item.adresse ? `LOCATION:${echapperICS(item.adresse)}` : null,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean)

  const blob = new Blob([lignes.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = `${item.titre.replace(/[^\w-]+/g, '_')}.ics`
  document.body.appendChild(lien)
  lien.click()
  document.body.removeChild(lien)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// Passe par un blob local : l'attribut `download` d'un <a> est ignoré par les
// navigateurs sur une URL cross-origin (le bucket Supabase), il faut donc
// rapatrier l'image nous-mêmes avant de déclencher le téléchargement.
export async function telechargerPhoto(url, nomFichier = 'photo.jpg') {
  const reponse = await fetch(url)
  const blob = await reponse.blob()
  const objetUrl = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = objetUrl
  lien.download = nomFichier
  document.body.appendChild(lien)
  lien.click()
  document.body.removeChild(lien)
  setTimeout(() => URL.revokeObjectURL(objetUrl), 4000)
}
