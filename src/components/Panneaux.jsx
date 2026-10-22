import { useEffect, useRef, useState } from 'react'
import { store, TYPES, TYPES_SORTIE, TYPES_SOUHAIT, TAGS_SUGGERES, chercherLieu, compresserImage, isRemote, telechargerEvenement, telechargerPhoto } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { IconeLoupe, Etoiles } from './Commun'

function Panneau({ onFermer, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const echap = (e) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', echap)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', echap)
  }, [onFermer])

  return (
    <div className="sheet-backdrop" onClick={onFermer}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__grab" />
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Fiche d'une envie : elle devient la fiche souvenir une fois faite.   */
/* ------------------------------------------------------------------ */

export function FicheEnvie({ item, profil, partenaire, onFermer, onModifier, onSupprimer, onAjouterPhoto, onSupprimerPhoto }) {
  const { t, langue } = useLangue()
  const [envoiPhoto, setEnvoiPhoto] = useState(false)
  const [erreur, setErreur] = useState('')
  const [photoOuverte, setPhotoOuverte] = useState(null) // index dans item.photos, ou null
  const type = TYPES[item.type] || TYPES.activite
  const photos = item.photos || []

  const basculer = () =>
    onModifier(item.id, {
      fait: !item.fait,
      date_faite: !item.fait ? new Date().toISOString().slice(0, 10) : null
    })

  const choisirPhoto = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur('')
    setEnvoiPhoto(true)
    try {
      const compressee = await compresserImage(fichier)
      await onAjouterPhoto(item.id, compressee)
    } catch (err) {
      setErreur(t(err.message) || t('photo_erreur'))
    } finally {
      setEnvoiPhoto(false)
    }
  }

  const basculerLike = (url) => {
    const aime = item.photo_likes?.[url] || []
    const likes = aime.includes(profil.id) ? aime.filter((id) => id !== profil.id) : [...aime, profil.id]
    onModifier(item.id, { photo_likes: { ...item.photo_likes, [url]: likes } })
  }

  return (
    <Panneau onFermer={onFermer}>
      <div className="card__type" style={{ marginBottom: 8 }}>
        <span className={`dot ${type.dot}`} />
        {t(`type_${item.type}`)}
      </div>
      <h2>{item.titre}</h2>
      {item.cree_le && (
        <p className="meta" style={{ marginBottom: 10 }}>{t('cree_le_affichage', { date: formaterDate(item.cree_le, langue) })}</p>
      )}
      {item.description && <p className="meta">{item.description}</p>}

      {item.tags?.length > 0 && (
        <div className="card__tags" style={{ marginBottom: 16 }}>
          {item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
      )}

      {item.adresse && <p className="meta">📍 {item.adresse}</p>}

      <button className={item.fait ? 'btn btn--gold' : 'btn'} onClick={basculer}>
        {item.fait ? t('remettre_envies') : t('cest_fait')}
      </button>

      {!item.fait && !item.wishlist && (
        <div className="field" style={{ marginTop: 16 }}>
          <label>{t('prevue_pour')}</label>
          <input
            type="datetime-local"
            value={versDatetimeLocal(item.date_prevue ? new Date(item.date_prevue) : new Date())}
            onChange={(e) =>
              onModifier(item.id, { date_prevue: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />

          {item.date_fin ? (
            <>
              <label style={{ marginTop: 10 }}>{t('jusquau')}</label>
              <input
                type="datetime-local"
                value={versDatetimeLocal(new Date(item.date_fin))}
                onChange={(e) =>
                  onModifier(item.id, { date_fin: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
              />
              <button
                className="btn btn--ghost"
                style={{ marginTop: 2 }}
                onClick={() => onModifier(item.id, { date_fin: null })}
              >
                {t('retirer_date_fin')}
              </button>
            </>
          ) : (
            <button
              className="btn btn--ghost"
              style={{ marginTop: 2 }}
              onClick={() => {
                const debut = item.date_prevue ? new Date(item.date_prevue) : new Date()
                const fin = new Date(debut.getTime() + 24 * 60 * 60 * 1000)
                onModifier(item.id, { date_fin: fin.toISOString() })
              }}
            >
              + {t('ajouter_date_fin')}
            </button>
          )}

          {item.date_prevue && (
            <button
              className="btn btn--ghost"
              style={{ marginTop: 2 }}
              onClick={() =>
                telechargerEvenement(item, new Date(item.date_prevue), item.date_fin ? new Date(item.date_fin) : null)
              }
            >
              {t('ajouter_calendrier')}
            </button>
          )}
        </div>
      )}

      {item.fait && (
        <>
          <div style={{ marginTop: 24 }}>
            <BlocAvis
              nom={profil.prenom}
              avatarUrl={profil.avatar_url}
              avis={item.avis?.[profil.id]}
              modifiable
              onNote={(n) =>
                onModifier(item.id, { avis: { ...item.avis, [profil.id]: { ...item.avis?.[profil.id], note: n } } })
              }
              onCommentaire={(texte) =>
                onModifier(item.id, {
                  avis: { ...item.avis, [profil.id]: { ...item.avis?.[profil.id], commentaire: texte } }
                })
              }
            />
          </div>

          {partenaire && (
            <BlocAvis
              nom={partenaire.prenom}
              avatarUrl={partenaire.avatar_url}
              avis={item.avis?.[partenaire.id]}
            />
          )}

          <div className="field">
            <label>{t('photos')}</label>
            <div className="photos">
              {photos.map((src, i) => {
                const likes = item.photo_likes?.[src] || []
                const aimee = likes.includes(profil.id)
                return (
                  <div className="photos__item" key={i}>
                    <button className="photos__voir" onClick={() => setPhotoOuverte(i)} aria-label={t('photo_agrandir_aria')}>
                      <img src={src} alt="" loading="lazy" />
                    </button>
                    <button
                      className="photos__suppr"
                      aria-label={t('supprimer_photo_aria')}
                      onClick={() => onSupprimerPhoto(item.id, src)}
                    >
                      ×
                    </button>
                    <button
                      className={`photos__like${aimee ? ' on' : ''}`}
                      aria-label={t('aimer_photo_aria')}
                      onClick={() => basculerLike(src)}
                    >
                      {aimee ? '♥' : '♡'}{likes.length > 0 && <span>{likes.length}</span>}
                    </button>
                  </div>
                )
              })}
              <label>
                {envoiPhoto ? '…' : '+'}
                <input type="file" accept="image/*,.heic,.heif" onChange={choisirPhoto} disabled={envoiPhoto} />
              </label>
            </div>
            {erreur && <p style={{ color: '#b3352c', fontSize: 13, marginTop: 8 }}>{erreur}</p>}
          </div>

          {photoOuverte !== null && (
            <PhotoLightbox
              photos={photos}
              index={photoOuverte}
              likes={item.photo_likes}
              profilId={profil.id}
              onFermer={() => setPhotoOuverte(null)}
              onNaviguer={setPhotoOuverte}
              onLiker={basculerLike}
            />
          )}

          {item.date_faite && <p className="meta">{t('fait_le', { date: formaterDate(item.date_faite, langue) })}</p>}
        </>
      )}

      <button className="btn btn--ghost" onClick={() => onSupprimer(item.id)}>
        {t('supprimer_envie')}
      </button>
    </Panneau>
  )
}

/* Plein écran au clic sur une photo, avec navigation, like et téléchargement. */
function PhotoLightbox({ photos, index, likes, profilId, onFermer, onNaviguer, onLiker }) {
  const { t } = useLangue()
  const src = photos[index]
  const aimee = (likes?.[src] || []).includes(profilId)
  const nbLikes = (likes?.[src] || []).length

  useEffect(() => {
    const clavier = (e) => {
      if (e.key === 'Escape') onFermer()
      if (e.key === 'ArrowRight' && index < photos.length - 1) onNaviguer(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) onNaviguer(index - 1)
    }
    window.addEventListener('keydown', clavier)
    return () => window.removeEventListener('keydown', clavier)
  }, [index, photos.length, onFermer, onNaviguer])

  return (
    <div className="lightbox" onClick={onFermer}>
      <button className="lightbox__fermer" onClick={onFermer} aria-label={t('fermer')}>×</button>

      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />

      {photos.length > 1 && index > 0 && (
        <button
          className="lightbox__nav lightbox__nav--prec"
          onClick={(e) => { e.stopPropagation(); onNaviguer(index - 1) }}
          aria-label={t('photo_precedente_aria')}
        >
          ‹
        </button>
      )}
      {photos.length > 1 && index < photos.length - 1 && (
        <button
          className="lightbox__nav lightbox__nav--suiv"
          onClick={(e) => { e.stopPropagation(); onNaviguer(index + 1) }}
          aria-label={t('photo_suivante_aria')}
        >
          ›
        </button>
      )}

      <div className="lightbox__barre" onClick={(e) => e.stopPropagation()}>
        <button className={`lightbox__like${aimee ? ' on' : ''}`} onClick={() => onLiker(src)} aria-label={t('aimer_photo_aria')}>
          {aimee ? '♥' : '♡'} {nbLikes > 0 && nbLikes}
        </button>
        <button className="lightbox__telecharger" onClick={() => telechargerPhoto(src, `photo-${index + 1}.jpg`)}>
          {t('telecharger')}
        </button>
      </div>
    </div>
  )
}

function BlocAvis({ nom, avatarUrl, avis, modifiable, onNote, onCommentaire }) {
  const { t, tn } = useLangue()
  const [commentaire, setCommentaire] = useState(avis?.commentaire || '')
  useEffect(() => setCommentaire(avis?.commentaire || ''), [avis?.commentaire])

  return (
    <div className="avis">
      <div className="avis__avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{(nom || '?')[0]}</span>}
      </div>
      <div className="avis__corps">
        <p className="avis__nom">{nom}</p>

        {modifiable ? (
          <div className="stars-input">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={n <= (avis?.note || 0) ? 'on' : ''}
                aria-label={tn('etoile', n)}
                onClick={() => onNote(n)}
              >
                ★
              </button>
            ))}
          </div>
        ) : (
          <Etoiles note={avis?.note || 0} vide={!avis?.note} />
        )}

        {modifiable ? (
          <textarea
            value={commentaire}
            placeholder={t('souvenir_placeholder')}
            onChange={(e) => setCommentaire(e.target.value)}
            onBlur={() => commentaire !== (avis?.commentaire || '') && onCommentaire(commentaire)}
            style={{ marginTop: 10 }}
          />
        ) : (
          <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>
            {avis?.commentaire || t('pas_encore_avis')}
          </p>
        )}
      </div>
    </div>
  )
}

function formaterDate(iso, langue) {
  return new Date(iso).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

// L'input datetime-local attend l'heure locale, sans fuseau — toISOString() donnerait l'heure UTC.
function versDatetimeLocal(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

/* ------------------------------------------------------------------ */
/* Formulaire d'ajout.                                                  */
/* ------------------------------------------------------------------ */

export function FormulaireEnvie({ lieuInitial, wishlist = false, onFermer, onCreer }) {
  const { t } = useLangue()
  const cles = wishlist ? TYPES_SOUHAIT : TYPES_SORTIE
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState(cles[0])
  const [tags, setTags] = useState([])
  const [ajoutEtiquette, setAjoutEtiquette] = useState(false)
  const [nouvelleEtiquette, setNouvelleEtiquette] = useState('')
  const [lieu, setLieu] = useState(lieuInitial || null)
  const [requete, setRequete] = useState('')
  const [resultats, setResultats] = useState([])
  const [datePrevue, setDatePrevue] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (requete.trim().length < 3) { setResultats([]); return }
    const delai = setTimeout(async () => {
      try { setResultats(await chercherLieu(requete)) } catch { setResultats([]) }
    }, 350)
    return () => clearTimeout(delai)
  }, [requete])

  const basculerTag = (tag) => setTags(tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag])

  const confirmerNouvelleEtiquette = () => {
    const tag = nouvelleEtiquette.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setNouvelleEtiquette('')
    setAjoutEtiquette(false)
  }

  const valider = () => {
    if (!titre.trim()) { setErreur(t('titre_manquant')); return }
    onCreer({
      titre: titre.trim(),
      description: description.trim(),
      type,
      wishlist,
      tags,
      fait: false,
      avis: {},
      photos: [],
      date_faite: null,
      date_prevue: datePrevue ? new Date(datePrevue).toISOString() : null,
      date_fin: null,
      lat: lieu?.lat ?? null,
      lng: lieu?.lng ?? null,
      adresse: lieu ? [lieu.nom, lieu.detail].filter(Boolean).join(' — ') : null
    })
  }

  return (
    <Panneau onFermer={onFermer}>
      <h2>{wishlist ? t('nouveau_souhait') : t('nouvelle_envie')}</h2>

      <div className="field">
        <label>{t('titre_champ')}</label>
        <input
          value={titre}
          placeholder={t('titre_placeholder')}
          onChange={(e) => { setTitre(e.target.value); setErreur('') }}
          autoFocus
        />
      </div>

      <div className="field">
        <label>{t('deux_mots')}</label>
        <input
          value={description}
          placeholder={t('deux_mots_placeholder')}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label>{t('type_champ')}</label>
        <div className="choice">
          {cles.map((cle) => (
            <button key={cle} aria-pressed={type === cle} onClick={() => setType(cle)}>
              <span className={`dot ${TYPES[cle].dot}`} />
              {t(`type_${cle}`)}
            </button>
          ))}
        </div>
      </div>

      {!wishlist && (
        <div className="field">
          <label>{t('prevue_pour')}</label>
          <input
            type="datetime-local"
            value={datePrevue}
            onChange={(e) => setDatePrevue(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label>{t('etiquettes')}</label>
        <div className="card__tags">
          {TAGS_SUGGERES.map((tag) => (
            <button
              key={tag}
              className="tag"
              onClick={() => basculerTag(tag)}
              style={tags.includes(tag) ? { background: '#16233d', color: '#F5F0E6' } : undefined}
            >
              {tag}
            </button>
          ))}
          {tags.filter((tag) => !TAGS_SUGGERES.includes(tag)).map((tag) => (
            <button
              key={tag}
              className="tag"
              onClick={() => basculerTag(tag)}
              style={{ background: '#16233d', color: '#F5F0E6' }}
            >
              {tag}
            </button>
          ))}
          {ajoutEtiquette ? (
            <input
              className="tag-input"
              autoFocus
              value={nouvelleEtiquette}
              placeholder={t('nouvelle_etiquette_placeholder')}
              onChange={(e) => setNouvelleEtiquette(e.target.value)}
              onBlur={confirmerNouvelleEtiquette}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); confirmerNouvelleEtiquette() }
                if (e.key === 'Escape') { setNouvelleEtiquette(''); setAjoutEtiquette(false) }
              }}
            />
          ) : (
            <button
              type="button"
              className="tag tag--ajouter"
              onClick={() => setAjoutEtiquette(true)}
              aria-label={t('ajouter_etiquette_aria')}
            >
              +
            </button>
          )}
        </div>
      </div>

      {!wishlist && (
      <div className="field">
        <label>{t('lieu_champ')}</label>
        {lieu ? (
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card__body">
              <strong style={{ fontWeight: 500 }}>{lieu.nom}</strong>
              <p className="card__desc">{lieu.detail}</p>
            </div>
            <button className="status status--todo" onClick={() => setLieu(null)}>{t('retirer')}</button>
          </div>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <input
                value={requete}
                placeholder={t('chercher_adresse')}
                onChange={(e) => setRequete(e.target.value)}
              />
            </div>
            {resultats.length > 0 && (
              <div className="map-results" style={{ position: 'static' }}>
                {resultats.map((r, i) => (
                  <button key={i} onClick={() => { setLieu(r); setRequete(''); setResultats([]) }}>
                    {r.nom}
                    <small>{r.detail}</small>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      )}

      {erreur && <p style={{ color: '#b3352c', fontSize: 13 }}>{erreur}</p>}

      <button className="btn" onClick={valider}>{t('ajouter_envies')}</button>
      <button className="btn btn--ghost" onClick={onFermer}>{t('annuler')}</button>
    </Panneau>
  )
}

/* ------------------------------------------------------------------ */
/* Profil : photo, code d'invitation, statut d'appairage.               */
/* ------------------------------------------------------------------ */

const HUMEURS = ['😊', '😍', '😌', '😴', '🤒', '😤', '😢', '🥳']

export function PanneauProfil({ profil, partenaire, onFermer, onAvatar, onPrenom, onHumeur }) {
  const { t, langue, changerLangue } = useLangue()
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [copie, setCopie] = useState(false)
  const [statutNotif, setStatutNotif] = useState('indisponible')
  const [erreurNotif, setErreurNotif] = useState('')

  const aujourdhui = new Date().toISOString().slice(0, 10)
  const monHumeur = profil.humeur_le === aujourdhui ? profil.humeur : null
  const humeurPartenaire = partenaire?.humeur_le === aujourdhui ? partenaire.humeur : null

  useEffect(() => {
    if (isRemote) store.statutNotifications().then(setStatutNotif)
  }, [])

  const basculerNotifications = async () => {
    setErreurNotif('')
    try {
      if (statutNotif === 'active') {
        await store.desactiverNotifications()
        setStatutNotif('inactive')
      } else {
        await store.activerNotifications()
        setStatutNotif('active')
      }
    } catch (err) {
      setErreurNotif(t(err.message) || t('notifications_erreur'))
    }
  }

  const editerPrenom = () => {
    const prenom = window.prompt(t('votre_prenom'), profil.prenom || '')
    if (prenom === null || !prenom.trim()) return
    onPrenom(prenom.trim())
  }

  const choisirPhoto = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur('')
    setEnvoi(true)
    try {
      const compressee = await compresserImage(fichier, 500, 0.85)
      await onAvatar(compressee)
    } catch (err) {
      setErreur(t(err.message) || t('photo_erreur_profil'))
    } finally {
      setEnvoi(false)
    }
  }

  const copierCode = async () => {
    try {
      await navigator.clipboard.writeText(profil.code_invitation)
      setCopie(true)
      setTimeout(() => setCopie(false), 1800)
    } catch { /* presse-papier indisponible : le code reste affichable à l'œil */ }
  }

  return (
    <Panneau onFermer={onFermer}>
      <h2>{t('votre_profil')}</h2>

      <div className="avatar-pick">
        <label>
          {profil.avatar_url ? <img src={profil.avatar_url} alt="" /> : <span>{(profil.prenom || '?')[0]}</span>}
          <span className="avatar-pick__badge">{envoi ? '…' : '✎'}</span>
          <input type="file" accept="image/*" onChange={choisirPhoto} disabled={envoi} />
        </label>
        <button className="meta" style={{ marginTop: 10 }} onClick={editerPrenom} title={t('votre_prenom')}>
          {profil.prenom} ✎
        </button>
      </div>

      {erreur && <p style={{ color: '#b3352c', fontSize: 13, textAlign: 'center' }}>{erreur}</p>}

      <div className="langue-switch">
        <button aria-pressed={langue === 'fr'} onClick={() => changerLangue('fr')}>FR</button>
        <span>/</span>
        <button aria-pressed={langue === 'en'} onClick={() => changerLangue('en')}>EN</button>
      </div>

      <div className="field">
        <label>{t('humeur_titre')}</label>
        <div className="humeurs">
          {HUMEURS.map((h) => (
            <button
              key={h}
              className={h === monHumeur ? 'on' : ''}
              aria-pressed={h === monHumeur}
              onClick={() => onHumeur(h)}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {isRemote ? (
        <>
          <div className="field" style={{ marginTop: 8 }}>
            <label>{t('statut')}</label>
            {partenaire ? (
              <p className="meta" style={{ marginBottom: 0 }}>
                {t('relie_a', { prenom: partenaire.prenom })}
              </p>
            ) : (
              <p className="meta" style={{ marginBottom: 0 }}>
                {t('en_attente_moitie')}
              </p>
            )}
          </div>

          {partenaire && (
            <div className="field" style={{ marginTop: -4 }}>
              <label>{t('humeur_partenaire', { prenom: partenaire.prenom })}</label>
              <p className="meta" style={{ marginBottom: 0, fontSize: 26 }}>
                {humeurPartenaire || <span style={{ fontSize: 13 }}>{t('humeur_aucune')}</span>}
              </p>
            </div>
          )}

          {partenaire && statutNotif !== 'indisponible' && (
            <div className="field">
              <label>{t('notifications_titre')}</label>
              <button
                className={statutNotif === 'active' ? 'btn btn--gold' : 'btn btn--ghost'}
                style={{ marginTop: 0 }}
                onClick={basculerNotifications}
                disabled={statutNotif === 'refusee'}
              >
                {statutNotif === 'active' && t('notifications_actives')}
                {statutNotif === 'inactive' && t('notifications_activer')}
                {statutNotif === 'refusee' && t('notifications_bloquees')}
              </button>
              {erreurNotif && <p style={{ color: '#b3352c', fontSize: 13, marginTop: 8 }}>{erreurNotif}</p>}
            </div>
          )}

          {!partenaire && (
            <>
              <p className="code" style={{ margin: '10px 0' }}>{profil.code_invitation}</p>
              <button className="btn" onClick={copierCode}>{copie ? t('copie') : t('copier_code')}</button>
            </>
          )}
        </>
      ) : (
        <p className="meta">{t('partage_non_actif')}</p>
      )}

      <button className="btn btn--ghost" onClick={onFermer}>{t('fermer')}</button>
    </Panneau>
  )
}

/* ------------------------------------------------------------------ */
/* Requests : demande texte libre adressée au/à la partenaire.          */
/* ------------------------------------------------------------------ */

export function PanneauRequete({ onFermer, onCreer }) {
  const { t } = useLangue()
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState('')

  const valider = () => {
    if (!texte.trim()) { setErreur(t('requete_manquante')); return }
    onCreer(texte.trim())
  }

  return (
    <Panneau onFermer={onFermer}>
      <h2>{t('nouvelle_requete')}</h2>

      <div className="field">
        <textarea
          autoFocus
          value={texte}
          placeholder={t('requete_placeholder')}
          onChange={(e) => { setTexte(e.target.value); setErreur('') }}
        />
      </div>

      {erreur && <p style={{ color: '#b3352c', fontSize: 13 }}>{erreur}</p>}

      <button className="btn" onClick={valider}>{t('envoyer_requete')}</button>
      <button className="btn btn--ghost" onClick={onFermer}>{t('annuler')}</button>
    </Panneau>
  )
}

export { Panneau, IconeLoupe }
