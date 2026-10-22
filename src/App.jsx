import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { store, isRemote } from './lib/store'
import { supabase } from './lib/supabase'
import { useLangue } from './lib/i18n'
import { BarreOnglets } from './components/Commun'
import { FicheEnvie, FormulaireEnvie, PanneauProfil, PanneauRequete } from './components/Panneaux'
import { PanneauCalendrier } from './components/Calendrier'
// MapLibre pèse lourd : on ne le charge qu'à l'ouverture de l'onglet Carte.
const CarteEcran = lazy(() => import('./screens/CarteEcran'))
import ListeEcran from './screens/ListeEcran'
import AFaireEcran from './screens/AFaireEcran'
import WishlistEcran from './screens/WishlistEcran'
import RequestsEcran from './screens/RequestsEcran'
import ConnexionEcran from './screens/ConnexionEcran'

export default function App() {
  const { t } = useLangue()
  const [profil, setProfil] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [items, setItems] = useState(() => lireCache())
  const [requetes, setRequetes] = useState([])
  const [onglet, setOnglet] = useState('liste')
  const [fiche, setFiche] = useState(null)
  const [formulaire, setFormulaire] = useState(null) // null | { lieu }
  const [panneauRequete, setPanneauRequete] = useState(false)
  const [message, setMessage] = useState('')
  const [profilOuvert, setProfilOuvert] = useState(false)
  const [calendrierOuvert, setCalendrierOuvert] = useState(false)
  const [partenaire, setPartenaire] = useState(null)

  /* ---------- Session ---------- */

  useEffect(() => {
    let vivant = true
    store.profil()
      .then((p) => { if (vivant) setProfil(p) })
      .catch((e) => { if (vivant) signaler(t(e.message) || t('profil_introuvable')) })
      .finally(() => { if (vivant) setChargement(false) })
    if (isRemote) {
      const { data } = supabase.auth.onAuthStateChange(async () => {
        try {
          const p = await store.profil()
          if (vivant) setProfil(p)
        } catch (e) {
          if (vivant) signaler(t(e.message) || t('profil_introuvable'))
        }
      })
      return () => { vivant = false; data.subscription.unsubscribe() }
    }
    return () => { vivant = false }
  }, [])

  /* ---------- Données ---------- */

  const rafraichir = useCallback(async () => {
    try {
      const liste = await store.lister()
      setItems(liste)
      ecrireCache(liste)
    } catch {
      signaler(t('synchro_impossible'))
    }
  }, [t])

  useEffect(() => {
    if (!profil?.couple_id) return
    rafraichir()
    return store.ecouter(rafraichir)
  }, [profil?.couple_id, rafraichir])

  const rafraichirRequetes = useCallback(async () => {
    try { setRequetes(await store.listerRequetes()) } catch { /* pas critique, on retentera plus tard */ }
  }, [])

  useEffect(() => {
    if (!profil?.couple_id) return
    rafraichirRequetes()
    return store.ecouterRequetes(rafraichirRequetes)
  }, [profil?.couple_id, rafraichirRequetes])

  useEffect(() => {
    if (!isRemote || !profil?.couple_id) { setPartenaire(null); return }
    store.partenaire(profil.couple_id).then(setPartenaire).catch(() => setPartenaire(null))
  }, [profil?.couple_id, profilOuvert])

  function signaler(texte) {
    setMessage(texte)
    setTimeout(() => setMessage(''), 3600)
  }

  /* ---------- Actions ---------- */

  const creer = async (donnees) => {
    setFormulaire(null)
    const provisoire = { ...donnees, id: `temp-${Date.now()}`, cree_le: new Date().toISOString() }
    setItems((liste) => [provisoire, ...liste])
    try {
      await store.creer(donnees)
      await rafraichir()
      signaler(t('envie_ajoutee'))
      store.envoyerNotification(t('notif_nouvelle_envie'), donnees.titre)
    } catch (e) {
      setItems((liste) => liste.filter((i) => i.id !== provisoire.id))
      signaler(t(e.message) || t('envie_erreur'))
    }
  }

  const modifier = async (id, patch) => {
    setItems((liste) => liste.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    setFiche((f) => (f && f.id === id ? { ...f, ...patch } : f))
    try {
      await store.modifier(id, patch)
      if (patch.avis) {
        const titre = items.find((i) => i.id === id)?.titre || ''
        store.envoyerNotification(t('notif_nouveau_commentaire'), titre)
      }
    } catch {
      signaler(t('modif_non_enregistree'))
      rafraichir()
    }
  }

  const basculer = (item) =>
    modifier(item.id, {
      fait: !item.fait,
      date_faite: !item.fait ? new Date().toISOString().slice(0, 10) : null
    })

  const supprimer = async (id) => {
    setFiche(null)
    setItems((liste) => liste.filter((i) => i.id !== id))
    try { await store.supprimer(id) } catch { signaler(t('suppr_non_enregistree')); rafraichir() }
  }

  const ajouterPhoto = async (id, dataUrl) => {
    const url = await store.ajouterPhoto(id, dataUrl)
    const titre = items.find((i) => i.id === id)?.titre || ''
    modifier(id, { photos: [...(items.find((i) => i.id === id)?.photos || []), url] })
    store.envoyerNotification(t('notif_nouvelle_photo'), titre)
  }

  const supprimerPhoto = async (id, url) => {
    const retirer = (photos) => (photos || []).filter((p) => p !== url)
    setItems((liste) => liste.map((i) => (i.id === id ? { ...i, photos: retirer(i.photos) } : i)))
    setFiche((f) => (f && f.id === id ? { ...f, photos: retirer(f.photos) } : f))
    try { await store.supprimerPhoto(id, url) } catch { signaler(t('suppr_photo_non_enregistree')); rafraichir() }
  }

  const creerRequete = async (texte) => {
    setPanneauRequete(false)
    try {
      await store.creerRequete(texte)
      await rafraichirRequetes()
      store.envoyerNotification(t('notif_nouvelle_demande'), texte)
    } catch (e) {
      signaler(t(e.message) || t('envie_erreur'))
    }
  }

  const ajouterRequeteATodo = async (requete) => {
    try {
      await store.creer({
        titre: requete.texte,
        description: '',
        type: 'activite',
        wishlist: false,
        tags: [],
        fait: false,
        avis: {},
        photos: [],
        date_faite: null,
        date_prevue: null,
        date_fin: null,
        lat: null,
        lng: null,
        adresse: null
      })
      await store.marquerRequeteAjoutee(requete.id)
      await Promise.all([rafraichir(), rafraichirRequetes()])
      signaler(t('envie_ajoutee'))
    } catch (e) {
      signaler(t(e.message) || t('envie_erreur'))
    }
  }

  const supprimerRequete = async (id) => {
    setRequetes((liste) => liste.filter((r) => r.id !== id))
    try { await store.supprimerRequete(id) } catch { signaler(t('suppr_non_enregistree')); rafraichirRequetes() }
  }

  const editerPhrase = async () => {
    const phrase = window.prompt(t('phrase_prompt'), profil.phrase_perso || '')
    if (phrase === null) return
    setProfil({ ...profil, phrase_perso: phrase })
    try { await store.majPhrase(phrase, profil.couple_id) } catch { signaler(t('phrase_non_enregistree')) }
  }

  const editerAvatar = async (dataUrl) => {
    const url = await store.majAvatar(dataUrl)
    setProfil((p) => ({ ...p, avatar_url: url }))
  }

  const editerPrenom = async (prenom) => {
    setProfil((p) => ({ ...p, prenom }))
    try { await store.majPrenom(prenom) } catch { signaler(t('prenom_non_enregistre')) }
  }

  const editerHumeur = async (humeur) => {
    const humeur_le = new Date().toISOString().slice(0, 10)
    setProfil((p) => ({ ...p, humeur, humeur_le }))
    try { await store.majHumeur(humeur) } catch { /* pas critique, on retentera au prochain changement */ }
  }

  const editerMessageJour = async (message) => {
    const message_jour_le = new Date().toISOString().slice(0, 10)
    setProfil((p) => ({ ...p, message_jour: message, message_jour_le }))
    try {
      await store.majMessageJour(message)
      if (message.trim()) store.envoyerNotification(t('notif_nouveau_message'), message.trim())
    } catch { /* pas critique, on retentera au prochain changement */ }
  }

  /* ---------- Rendu ---------- */

  if (chargement) return <div className="gate"><p>{t('un_instant')}</p></div>
  if (!profil || !profil.couple_id) return <ConnexionEcran profil={profil} onPret={setProfil} />

  const sorties = items.filter((i) => !i.wishlist)
  const souhaits = items.filter((i) => i.wishlist)
  const restants = sorties.filter((i) => !i.fait).length

  return (
    <div className="app">
      {onglet === 'carte' && (
        <Suspense fallback={<div className="screen"><p style={{ textAlign: 'center' }}>{t('chargement_carte')}</p></div>}>
          <CarteEcran
            items={sorties}
            onOuvrir={setFiche}
            onAjouterIci={(lieu) => setFormulaire({ lieu })}
          />
        </Suspense>
      )}
      {onglet === 'liste' && (
        <ListeEcran
          items={sorties}
          phrase={profil.phrase_perso}
          onEditPhrase={editerPhrase}
          avatarUrl={profil.avatar_url}
          onOuvrirProfil={() => setProfilOuvert(true)}
          onOuvrir={setFiche}
          onBasculer={basculer}
        />
      )}
      {onglet === 'afaire' && (
        <AFaireEcran
          items={sorties}
          onOuvrir={setFiche}
          onBasculer={basculer}
          avatarUrl={profil.avatar_url}
          onOuvrirProfil={() => setProfilOuvert(true)}
          onOuvrirCalendrier={() => setCalendrierOuvert(true)}
        />
      )}
      {onglet === 'wishlist' && (
        <WishlistEcran
          items={souhaits}
          onOuvrir={setFiche}
          onBasculer={basculer}
          avatarUrl={profil.avatar_url}
          onOuvrirProfil={() => setProfilOuvert(true)}
        />
      )}
      {onglet === 'requests' && (
        <RequestsEcran
          requetes={requetes}
          profil={profil}
          partenaire={partenaire}
          onAjouterTodo={ajouterRequeteATodo}
          onSupprimer={supprimerRequete}
          avatarUrl={profil.avatar_url}
          onOuvrirProfil={() => setProfilOuvert(true)}
        />
      )}

      {message && <div className="toast">{message}</div>}

      <BarreOnglets
        actif={onglet}
        onChange={setOnglet}
        aFaire={restants}
        requetes={requetes.filter((r) => r.statut === 'ouverte').length}
      />

      {fiche && (
        <FicheEnvie
          item={items.find((i) => i.id === fiche.id) || fiche}
          profil={profil}
          partenaire={partenaire}
          onFermer={() => setFiche(null)}
          onModifier={modifier}
          onSupprimer={supprimer}
          onAjouterPhoto={ajouterPhoto}
          onSupprimerPhoto={supprimerPhoto}
        />
      )}

      {formulaire && (
        <FormulaireEnvie
          lieuInitial={formulaire.lieu}
          wishlist={onglet === 'wishlist'}
          onFermer={() => setFormulaire(null)}
          onCreer={creer}
        />
      )}

      {profilOuvert && (
        <PanneauProfil
          profil={profil}
          partenaire={partenaire}
          onFermer={() => setProfilOuvert(false)}
          onAvatar={editerAvatar}
          onPrenom={editerPrenom}
          onHumeur={editerHumeur}
          onMessageJour={editerMessageJour}
        />
      )}

      {panneauRequete && (
        <PanneauRequete onFermer={() => setPanneauRequete(false)} onCreer={creerRequete} />
      )}

      {calendrierOuvert && (
        <PanneauCalendrier
          items={sorties}
          onFermer={() => setCalendrierOuvert(false)}
          onOuvrir={(item) => { setCalendrierOuvert(false); setFiche(item) }}
        />
      )}

      {onglet !== 'carte' && (
        <button
          className="fab"
          onClick={() => (onglet === 'requests' ? setPanneauRequete(true) : setFormulaire({ lieu: null }))}
          aria-label={t('ajouter_envie_aria')}
        >
          +
        </button>
      )}
    </div>
  )
}

/* Cache local : l'app s'ouvre immédiatement, même sans réseau. */
function lireCache() {
  try { return JSON.parse(localStorage.getItem('envies:cache')) || [] } catch { return [] }
}
function ecrireCache(liste) {
  try { localStorage.setItem('envies:cache', JSON.stringify(liste)) } catch { /* quota */ }
}
