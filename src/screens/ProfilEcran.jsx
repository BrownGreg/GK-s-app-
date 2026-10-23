import { useEffect, useState } from 'react'
import { store, isRemote, HUMEURS_BASE, resoudreHumeur } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { Panneau } from '../components/Panneaux'
import { RogneurPhoto } from '../components/RogneurPhoto'
import { SelecteurHumeurImage } from '../components/SelecteurHumeurImage'

const PALETTE_COULEURS = [
  '#C89B3C', '#E2574C', '#2E7D6F', '#6B7AA1', '#8B5D8F',
  '#C17A4E', '#4A7FC1', '#D66FA0', '#5BAF7A', '#B5533C'
]

function formaterDateCourte(date, langue) {
  const locale = langue === 'fr' ? 'fr-FR' : 'en-US'
  return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

function AjoutHumeur({ onValider, onAnnuler }) {
  const { t } = useLangue()
  const [label, setLabel] = useState('')
  const [couleur, setCouleur] = useState(PALETTE_COULEURS[0])
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const valider = async () => {
    if (!label.trim()) { setErreur(t('titre_manquant')); return }
    setEnvoi(true)
    try {
      await onValider(label.trim(), couleur)
    } catch (err) {
      setErreur(t(err.message) || t('erreur_generique'))
      setEnvoi(false)
    }
  }

  return (
    <Panneau onFermer={onAnnuler}>
      <h2>{t('humeur_ajouter')}</h2>

      <div className="field">
        <label>{t('humeur_nouvelle_label')}</label>
        <input
          autoFocus
          value={label}
          maxLength={20}
          placeholder={t('humeur_nouvelle_placeholder')}
          onChange={(e) => { setLabel(e.target.value); setErreur('') }}
        />
      </div>

      <div className="field">
        <label>{t('humeur_choisir_couleur')}</label>
        <div className="palette">
          {PALETTE_COULEURS.map((c) => (
            <button
              key={c}
              className={c === couleur ? 'on' : ''}
              style={{ background: c }}
              onClick={() => setCouleur(c)}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            className="palette__perso"
            value={couleur}
            onChange={(e) => setCouleur(e.target.value)}
            aria-label={t('humeur_choisir_couleur')}
          />
        </div>
      </div>

      {erreur && <p className="erreur-texte">{erreur}</p>}

      <button className="btn" onClick={valider} disabled={envoi}>{t('valider')}</button>
      <button className="btn btn--ghost" onClick={onAnnuler}>{t('annuler')}</button>
    </Panneau>
  )
}

export default function ProfilEcran({ profil, partenaire, onFermer, onAvatar, onPrenom, onHumeur, onMessageJour }) {
  const { t, langue, changerLangue } = useLangue()

  const [erreur, setErreur] = useState('')
  const [envoiAvatar, setEnvoiAvatar] = useState(false)
  const [fichierARogner, setFichierARogner] = useState(null)

  const [humeursPerso, setHumeursPerso] = useState([])
  const [ajoutHumeurOuvert, setAjoutHumeurOuvert] = useState(false)
  const [selecteurImageOuvert, setSelecteurImageOuvert] = useState(false)

  const [statutNotif, setStatutNotif] = useState('indisponible')
  const [erreurNotif, setErreurNotif] = useState('')

  const [messageJour, setMessageJour] = useState(profil.message_jour || '')
  const [signeEnvoye, setSigneEnvoye] = useState(false)
  const [copie, setCopie] = useState(false)

  const aujourdhui = new Date().toISOString().slice(0, 10)
  const monHumeurId = profil.humeur_le === aujourdhui ? profil.humeur : null
  const monHumeurImage = profil.humeur_le === aujourdhui ? profil.humeur_image_url : null
  const humeurPartenaireId = partenaire?.humeur_le === aujourdhui ? partenaire.humeur : null
  const messagePartenaire = partenaire?.message_jour_le === aujourdhui ? partenaire.message_jour : null

  const monHumeur = resoudreHumeur(monHumeurId, t, humeursPerso)
  const humeurPartenaire = resoudreHumeur(humeurPartenaireId, t, humeursPerso)

  useEffect(() => {
    setMessageJour(profil.message_jour_le === aujourdhui ? profil.message_jour || '' : '')
  }, [profil.message_jour, profil.message_jour_le]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isRemote) store.statutNotifications().then(setStatutNotif)
  }, [])

  useEffect(() => {
    store.humeursPerso().then(setHumeursPerso).catch(() => {})
  }, [])

  const editerPrenom = () => {
    const prenom = window.prompt(t('votre_prenom'), profil.prenom || '')
    if (prenom === null || !prenom.trim()) return
    onPrenom(prenom.trim())
  }

  const choisirPhoto = (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur('')
    setFichierARogner(fichier)
  }

  const validerRognage = async (imageRognee) => {
    setFichierARogner(null)
    setEnvoiAvatar(true)
    try {
      await onAvatar(imageRognee)
    } catch (err) {
      setErreur(t(err.message) || t('photo_erreur_profil'))
    } finally {
      setEnvoiAvatar(false)
    }
  }

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

  const copierCode = async () => {
    try {
      await navigator.clipboard.writeText(profil.code_invitation)
      setCopie(true)
      setTimeout(() => setCopie(false), 1800)
    } catch { /* presse-papier indisponible : le code reste affichable à l'œil */ }
  }

  const envoyerSigne = () => {
    store.envoyerNotification(t('notif_signe_titre'), t('notif_signe_corps', { prenom: profil.prenom }))
    setSigneEnvoye(true)
    setTimeout(() => setSigneEnvoye(false), 2400)
  }

  const envoyerMessage = () => {
    onMessageJour(messageJour.trim())
  }

  const ajouterHumeur = async (label, couleur) => {
    const nouvelle = await store.ajouterHumeurPerso(label, couleur)
    setHumeursPerso((liste) => [...liste, nouvelle])
    setAjoutHumeurOuvert(false)
    onHumeur(nouvelle.id, null)
  }

  const choisirImageHumeur = (image) => {
    setSelecteurImageOuvert(false)
    onHumeur(monHumeurId, image)
  }

  return (
    <div className="profil-ecran">
      <header className="profil-ecran__entete">
        <button className="profil-ecran__rond" onClick={onFermer} aria-label={t('retour_aria')}>‹</button>
        <h1>{t('profil_page_titre')}</h1>
        <button className="profil-ecran__rond" onClick={editerPrenom} aria-label={t('votre_prenom')}>✎</button>
      </header>

      <div className="profil-ecran__corps">
        <div className="couple-carte">
          <div className="couple-carte__avatars">
            <label className="couple-carte__avatar couple-carte__avatar--moi">
              {profil.avatar_url ? <img src={profil.avatar_url} alt="" /> : <span>{(profil.prenom || '?')[0]}</span>}
              <span className="couple-carte__badge">{envoiAvatar ? '…' : '✎'}</span>
              <input type="file" accept="image/*" onChange={choisirPhoto} disabled={envoiAvatar} />
            </label>
            {partenaire && (
              <div className="couple-carte__avatar couple-carte__avatar--partenaire">
                {partenaire.avatar_url ? <img src={partenaire.avatar_url} alt="" /> : <span>{(partenaire.prenom || '?')[0]}</span>}
              </div>
            )}
          </div>
          <div className="couple-carte__texte">
            <h2>{profil.prenom}{partenaire ? ` & ${partenaire.prenom}` : ''}</h2>
            <p>
              <span className={`couple-carte__puce${partenaire ? ' on' : ''}`} />
              {partenaire ? t('profil_relies') : t('en_attente_moitie')}
            </p>
          </div>
        </div>

        {erreur && <p className="erreur-texte">{erreur}</p>}

        {isRemote && partenaire && (
          <>
            <div className="profil-section__entete">
              <h3>{t('profil_aujourdhui')}</h3>
              <span className="meta" style={{ margin: 0, textTransform: 'capitalize' }}>
                {formaterDateCourte(new Date(), langue)}
              </span>
            </div>
            <div className="aujourdhui-grille">
              <div className="aujourdhui-carte">
                <span className="aujourdhui-carte__label">{t('profil_toi')}</span>
                <p>{monHumeur ? monHumeur.label : t('profil_pas_partage')}</p>
              </div>
              <div className={`aujourdhui-carte${humeurPartenaire ? '' : ' aujourdhui-carte--vide'}`}>
                <span className="aujourdhui-carte__label">{partenaire.prenom}</span>
                {humeurPartenaire ? (
                  <p>{humeurPartenaire.label}</p>
                ) : (
                  <>
                    <p className="meta" style={{ margin: '2px 0 8px' }}>{t('profil_pas_partage')}</p>
                    <button className="btn btn--ghost" style={{ margin: 0, padding: '8px 10px', fontSize: 13 }} onClick={envoyerSigne}>
                      {signeEnvoye ? '✓' : t('profil_lui_faire_signe')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        <h3 className="profil-section__titre">{t('humeur_titre')}</h3>
        <div className="humeur-grille">
          {HUMEURS_BASE.map((h) => (
            <button
              key={h.id}
              className={`humeur-carte${h.id === monHumeurId ? ' on' : ''}`}
              onClick={() => onHumeur(h.id, null)}
            >
              <span className="humeur-carte__dot" style={{ background: h.couleur }} />
              {t(h.labelKey)}
            </button>
          ))}
          {humeursPerso.map((h) => (
            <button
              key={h.id}
              className={`humeur-carte${h.id === monHumeurId ? ' on' : ''}`}
              onClick={() => onHumeur(h.id, null)}
            >
              <span className="humeur-carte__dot" style={{ background: h.couleur }} />
              {h.label}
            </button>
          ))}
          <button className="humeur-carte humeur-carte--ajouter" onClick={() => setAjoutHumeurOuvert(true)}>
            + {t('humeur_ajouter')}
          </button>
        </div>

        {monHumeurId && (
          monHumeurImage ? (
            <div className="humeur-image">
              <img src={monHumeurImage} alt="" />
              <div className="humeur-image__actions">
                <button className="btn btn--ghost-clair" onClick={() => setSelecteurImageOuvert(true)}>
                  {t('humeur_changer_photo')}
                </button>
                <button className="btn btn--ghost-clair" onClick={() => onHumeur(monHumeurId, null)}>
                  {t('humeur_supprimer_photo')}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn--ghost-clair" style={{ marginTop: -8, marginBottom: 20 }} onClick={() => setSelecteurImageOuvert(true)}>
              {t('humeur_ajouter_photo')}
            </button>
          )
        )}

        {isRemote && partenaire && (
          <>
            <h3 className="profil-section__titre">{t('message_jour_titre')}</h3>
            <div className="message-bulle">
              <span className="message-bulle__avatar">
                {partenaire.avatar_url ? <img src={partenaire.avatar_url} alt="" /> : (partenaire.prenom || '?')[0]}
              </span>
              <p className={messagePartenaire ? '' : 'message-bulle__vide'}>
                {messagePartenaire || t('message_jour_aucun')}
              </p>
            </div>
            <div className="message-saisie">
              <label>{t('message_jour_label', { prenom: partenaire.prenom })}</label>
              <textarea
                value={messageJour}
                maxLength={280}
                placeholder={t('message_jour_placeholder')}
                onChange={(e) => setMessageJour(e.target.value)}
              />
              <div className="message-saisie__barre">
                <span className="meta" style={{ margin: 0 }}>{messageJour.length}/280</span>
                <button className="message-saisie__envoyer" onClick={envoyerMessage} aria-label={t('envoyer_requete')}>→</button>
              </div>
            </div>
          </>
        )}

        <h3 className="profil-section__titre">{t('reglages_titre')}</h3>

        {isRemote && partenaire && statutNotif !== 'indisponible' && (
          <div className="reglage-ligne">
            <div>
              <p className="reglage-ligne__label">{t('notifications_titre')}</p>
              <p className="reglage-ligne__desc">{t('notifications_description', { prenom: partenaire.prenom })}</p>
            </div>
            <button
              className={`toggle${statutNotif === 'active' ? ' on' : ''}`}
              role="switch"
              aria-checked={statutNotif === 'active'}
              disabled={statutNotif === 'refusee'}
              onClick={basculerNotifications}
            >
              <span />
            </button>
          </div>
        )}
        {erreurNotif && <p className="erreur-texte">{erreurNotif}</p>}

        <div className="reglage-ligne">
          <p className="reglage-ligne__label">{t('langue_titre')}</p>
          <div className="langue-switch" style={{ margin: 0 }}>
            <button aria-pressed={langue === 'fr'} onClick={() => changerLangue('fr')}>FR</button>
            <span>/</span>
            <button aria-pressed={langue === 'en'} onClick={() => changerLangue('en')}>EN</button>
          </div>
        </div>

        {isRemote && !partenaire && (
          <div className="reglage-ligne reglage-ligne--colonne">
            <p className="reglage-ligne__label">{t('en_attente_moitie')}</p>
            <p className="code" style={{ margin: '10px 0' }}>{profil.code_invitation}</p>
            <button className="btn" onClick={copierCode}>{copie ? t('copie') : t('copier_code')}</button>
          </div>
        )}

        {!isRemote && <p className="meta">{t('partage_non_actif')}</p>}
      </div>

      {fichierARogner && (
        <RogneurPhoto
          fichier={fichierARogner}
          onValider={validerRognage}
          onAnnuler={() => setFichierARogner(null)}
        />
      )}

      {ajoutHumeurOuvert && (
        <AjoutHumeur onValider={ajouterHumeur} onAnnuler={() => setAjoutHumeurOuvert(false)} />
      )}

      {selecteurImageOuvert && (
        <SelecteurHumeurImage onChoisir={choisirImageHumeur} onAnnuler={() => setSelecteurImageOuvert(false)} />
      )}
    </div>
  )
}
