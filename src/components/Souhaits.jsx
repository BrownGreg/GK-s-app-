import { useState } from 'react'
import { compresserImage } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { BottomSheet as Panneau } from './BottomSheet'

/* ------------------------------------------------------------------ */
/* Wishlist : une vraie liste de souhaits (image, prix, lien), chacun·e  */
/* la sienne ; l'autre peut réserver un article pour l'offrir.          */
/* ------------------------------------------------------------------ */

export function formaterPrix(prix, langue) {
  if (prix === null || prix === undefined || prix === '') return ''
  return new Intl.NumberFormat(langue === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: Number(prix) % 1 === 0 ? 0 : 2
  }).format(Number(prix))
}

// « https://www.amazon.fr/dp/… » → « amazon.fr » : plus lisible qu'une URL entière.
export function domaineLien(lien) {
  try { return new URL(lien).hostname.replace(/^www\./, '') } catch { return '' }
}

function normaliserLien(texte) {
  const brut = texte.trim()
  if (!brut) return null
  return /^https?:\/\//i.test(brut) ? brut : `https://${brut}`
}

// « 24,90 » comme « 24.90 » ; vide → pas de prix ; NaN → invalide.
function lirePrix(texte) {
  const brut = String(texte ?? '').trim().replace(/\s/g, '').replace(',', '.').replace(/€$/, '')
  if (!brut) return null
  const n = Number(brut)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN
}

function Vignette({ souhait, grande = false }) {
  const classe = `souhait-vignette${grande ? ' souhait-vignette--grande' : ''}`
  if (souhait.image_url) return <img className={classe} src={souhait.image_url} alt="" loading="lazy" />
  return (
    <div className={`${classe} souhait-vignette--vide`} aria-hidden="true">
      {(souhait.titre || '?').charAt(0).toUpperCase()}
    </div>
  )
}

// `vueProprietaire` : la réservation n'est jamais montrée à qui a fait le souhait.
export function CarteSouhait({ souhait, profilId, onOuvrir }) {
  const { t, langue } = useLangue()
  const estAMoi = souhait.cree_par === profilId
  const reserveParMoi = !estAMoi && souhait.reserve_par === profilId
  const domaine = souhait.lien ? domaineLien(souhait.lien) : ''

  return (
    <button className={`souhait-carte${souhait.recu ? ' souhait-carte--recu' : ''}`} onClick={() => onOuvrir(souhait)}>
      <div className="souhait-carte__image">
        <Vignette souhait={souhait} />
        {reserveParMoi && !souhait.recu && <span className="souhait-carte__badge">🎁 {t('souhait_reserve_par_toi_court')}</span>}
        {souhait.recu && <span className="souhait-carte__badge">✓ {t('souhait_recu')}</span>}
      </div>
      <div className="souhait-carte__corps">
        <span className="souhait-carte__titre">{souhait.titre}</span>
        {souhait.prix != null && <span className="souhait-carte__prix">{formaterPrix(souhait.prix, langue)}</span>}
        {domaine && <span className="souhait-carte__domaine">↗ {domaine}</span>}
      </div>
    </button>
  )
}

export function FicheSouhait({ souhait, profil, partenaire, onFermer, onEditer, onModifier, onSupprimer }) {
  const { t, langue } = useLangue()
  const estAMoi = souhait.cree_par === profil.id
  const reserveParMoi = !estAMoi && souhait.reserve_par === profil.id
  const proprietaire = estAMoi ? null : partenaire

  const supprimer = () => {
    if (window.confirm(t('souhait_supprimer_confirmer', { titre: souhait.titre }))) onSupprimer(souhait.id)
  }

  return (
    <Panneau onFermer={onFermer} labelAria={souhait.titre}>
      <Vignette souhait={souhait} grande />

      {!estAMoi && proprietaire && (
        <p className="souhait-fiche__pour">{t('souhait_envie_de', { prenom: proprietaire.prenom })}</p>
      )}
      <h2 style={{ marginBottom: 4 }}>{souhait.titre}</h2>
      {souhait.prix != null && <p className="souhait-fiche__prix">{formaterPrix(souhait.prix, langue)}</p>}
      {souhait.notes && <p className="meta" style={{ whiteSpace: 'pre-wrap' }}>{souhait.notes}</p>}

      {souhait.lien && (
        <a className="souhait-fiche__lien" href={souhait.lien} target="_blank" rel="noopener noreferrer">
          {t('souhait_voir_article')} · {domaineLien(souhait.lien)} ↗
        </a>
      )}

      {estAMoi ? (
        <>
          <button className="btn-modifier" onClick={() => onEditer(souhait)}>✎ {t('souhait_modifier')}</button>
          <button
            className={souhait.recu ? 'btn' : 'btn btn--gold'}
            onClick={() => onModifier(souhait.id, { recu: !souhait.recu })}
          >
            {souhait.recu ? t('souhait_remettre') : t('souhait_marquer_recu')}
          </button>
          <button className="btn btn--ghost" onClick={supprimer}>{t('souhait_supprimer')}</button>
        </>
      ) : !souhait.recu && (
        <>
          <button
            className={reserveParMoi ? 'btn btn--gold' : 'btn'}
            onClick={() => onModifier(souhait.id, { reserve_par: reserveParMoi ? null : profil.id })}
          >
            {reserveParMoi ? t('souhait_annuler_reservation') : `🎁 ${t('souhait_reserver')}`}
          </button>
          <p className="souhait-fiche__discret">
            {reserveParMoi
              ? t('souhait_reserve_par_toi', { prenom: proprietaire?.prenom || '' })
              : t('souhait_reserver_aide', { prenom: proprietaire?.prenom || '' })}
          </p>
        </>
      )}
    </Panneau>
  )
}

export function FormulaireSouhait({ souhait = null, onFermer, onCreer, onEnregistrer }) {
  const { t } = useLangue()
  const estEdition = !!souhait
  const [titre, setTitre] = useState(souhait?.titre || '')
  const [prix, setPrix] = useState(souhait?.prix != null ? String(souhait.prix).replace('.', ',') : '')
  const [lien, setLien] = useState(souhait?.lien || '')
  const [notes, setNotes] = useState(souhait?.notes || '')
  // Image : URL existante, data URL fraîchement choisie, ou null.
  const [image, setImage] = useState(souhait?.image_url || null)
  const [imageModifiee, setImageModifiee] = useState(false)
  const [chargementImage, setChargementImage] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const choisirImage = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur('')
    setChargementImage(true)
    try {
      setImage(await compresserImage(fichier, 1000))
      setImageModifiee(true)
    } catch (err) {
      setErreur(t(err.message) || t('photo_erreur'))
    } finally {
      setChargementImage(false)
    }
  }

  const retirerImage = () => { setImage(null); setImageModifiee(true) }

  const valider = async () => {
    if (!titre.trim()) { setErreur(t('titre_manquant')); return }
    const prixLu = lirePrix(prix)
    if (Number.isNaN(prixLu)) { setErreur(t('souhait_prix_invalide')); return }
    const donnees = {
      titre: titre.trim(),
      prix: prixLu,
      lien: normaliserLien(lien),
      notes: notes.trim()
    }
    setEnvoi(true)
    setErreur('')
    try {
      if (estEdition) {
        await onEnregistrer(souhait.id, imageModifiee ? { ...donnees, image } : donnees)
      } else {
        await onCreer({ ...donnees, image })
      }
    } catch (err) {
      setErreur(t(err.message) || t('erreur_generique'))
      setEnvoi(false)
    }
  }

  return (
    <Panneau onFermer={onFermer}>
      <h2>{estEdition ? t('souhait_modifier') : t('nouveau_souhait')}</h2>

      <div className="field">
        <label>{t('souhait_image')}</label>
        <div className="souhait-image-choix">
          {image ? (
            <>
              <img src={image} alt="" />
              <div className="souhait-image-choix__actions">
                <label className="souhait-image-choix__bouton">
                  {chargementImage ? '…' : t('humeur_changer_photo')}
                  <input type="file" accept="image/*,.heic,.heif" onChange={choisirImage} disabled={chargementImage} />
                </label>
                <button type="button" className="souhait-image-choix__bouton" onClick={retirerImage}>
                  {t('humeur_supprimer_photo')}
                </button>
              </div>
            </>
          ) : (
            <label className="souhait-image-choix__vide">
              <span aria-hidden="true">{chargementImage ? '…' : '+'}</span>
              {t('souhait_ajouter_image')}
              <input type="file" accept="image/*,.heic,.heif" onChange={choisirImage} disabled={chargementImage} />
            </label>
          )}
        </div>
      </div>

      <div className="field">
        <label>{t('souhait_nom')}</label>
        <input
          value={titre}
          placeholder={t('souhait_nom_placeholder')}
          onChange={(e) => { setTitre(e.target.value); setErreur('') }}
          autoFocus={!estEdition}
        />
      </div>

      <div className="field">
        <label>{t('souhait_prix')}</label>
        <input
          inputMode="decimal"
          value={prix}
          placeholder="49,90"
          onChange={(e) => { setPrix(e.target.value); setErreur('') }}
        />
      </div>

      <div className="field">
        <label>{t('souhait_lien')}</label>
        <input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          value={lien}
          placeholder="https://…"
          onChange={(e) => setLien(e.target.value)}
        />
      </div>

      <div className="field">
        <label>{t('souhait_notes')}</label>
        <textarea
          value={notes}
          placeholder={t('souhait_notes_placeholder')}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {erreur && <p className="erreur-texte">{erreur}</p>}

      <button className="btn" onClick={valider} disabled={envoi || chargementImage}>
        {envoi ? '…' : estEdition ? t('enregistrer') : t('souhait_ajouter')}
      </button>
      <button className="btn btn--ghost" onClick={onFermer}>{t('annuler')}</button>
    </Panneau>
  )
}
