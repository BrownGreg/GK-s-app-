import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { Vide } from '../components/Commun'
import { SegmentedTabs, Switch } from '../components/ui'
import { BottomSheet as Panneau } from '../components/BottomSheet'
import { repartirCapsules, tempsRestant } from '../lib/capsulesLogic'

const locale = (langue) => (langue === 'fr' ? 'fr-FR' : 'en-US')

function formaterDate(iso, langue) {
  return new Date(iso).toLocaleDateString(locale(langue), { day: 'numeric', month: 'long', year: 'numeric' })
}

function formaterDateHeure(iso, langue) {
  const d = new Date(iso)
  return `${formaterDate(iso, langue)} · ${d.toLocaleTimeString(locale(langue), { hour: '2-digit', minute: '2-digit' })}`
}

// 'YYYY-MM-DD' dans le fuseau local (toISOString passerait en UTC et
// décalerait d'un jour le soir).
function versChampDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dansMois(n) {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return versChampDate(d)
}

function IconeEnveloppe({ ouverte = false }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ouverte ? (
        <>
          <path d="M3 10l9-6 9 6v9H3z" />
          <path d="M3 10l9 6 9-6" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </>
      )}
    </svg>
  )
}

function IconeCadenas() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export default function CapsulesEcran({ capsules, profil, partenaire, peutEcrire, onFermer, onCreer, onOuvrir, onSupprimer }) {
  const { t, langue } = useLangue()
  const [onglet, setOnglet] = useState('recues')
  const [ecriture, setEcriture] = useState(false)
  const [lecture, setLecture] = useState(null)

  const { recues, enAttente, envoyees } = repartirCapsules(capsules, profil.id)
  const nonLues = recues.filter((c) => !c.lue_le).length
  const prenomDe = (id) => (id === profil.id ? profil.prenom : partenaire?.prenom || '')

  const lire = (c) => {
    setLecture(c)
    if (!c.lue_le) onOuvrir(c)
  }

  const supprimer = (c) => {
    if (window.confirm(t('capsule_retirer_confirmer'))) onSupprimer(c.id)
  }

  return (
    <div className="boutique-ecran">
      <header className="boutique-ecran__entete">
        <button className="boutique-ecran__rond" onClick={onFermer} aria-label={t('retour_aria')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1>{t('capsules_titre')}</h1>
      </header>

      <SegmentedTabs
        fond="navy"
        className="segmented-tabs--ecran"
        labelAria={t('capsules_sections_aria')}
        actif={onglet}
        onChange={setOnglet}
        onglets={[
          { id: 'recues', label: t('capsules_recues'), count: nonLues || null },
          { id: 'envoyees', label: t('capsules_envoyees') }
        ]}
      />

      <div className="boutique-ecran__corps capsules-corps">
        {onglet === 'recues' && (
          recues.length === 0 && enAttente.length === 0 ? (
            <Vide titre={t('capsules_recues_vide_titre')} texte={t('capsules_recues_vide_texte')} />
          ) : (
            <>
              {enAttente.length > 0 && (
                <>
                  <div className="boutique-ecran__section-entete">
                    <h2>{t('capsules_en_chemin')}</h2>
                    <span>{enAttente.length}</span>
                  </div>
                  {enAttente.map((c) => (
                    <article className="capsule-carte capsule-carte--scellee" key={c.id}>
                      <div className="capsule-carte__entete">
                        <span className="capsule-carte__icone"><IconeEnveloppe /></span>
                        <span className="capsule-carte__meta">{t('capsule_de', { prenom: prenomDe(c.auteur) })}</span>
                        <span className="capsule-carte__pastille"><IconeCadenas /> {tempsRestant(c.ouvre_le, langue)}</span>
                      </div>
                      <div className="capsule-carte__flou" aria-hidden="true"><span /><span /><span /></div>
                      <p className="capsule-carte__date">{t('capsule_souvre_le', { date: formaterDateHeure(c.ouvre_le, langue) })}</p>
                    </article>
                  ))}
                </>
              )}

              {recues.length > 0 && (
                <>
                  <div className="boutique-ecran__section-entete">
                    <h2>{t('capsules_ouvertes')}</h2>
                    <span>{recues.length}</span>
                  </div>
                  {recues.map((c) => (
                    <button
                      className={`capsule-carte capsule-carte--bouton${c.lue_le ? '' : ' capsule-carte--nouvelle'}`}
                      key={c.id}
                      onClick={() => lire(c)}
                    >
                      <div className="capsule-carte__entete">
                        <span className="capsule-carte__icone"><IconeEnveloppe ouverte={!!c.lue_le} /></span>
                        <span className="capsule-carte__meta">
                          {t('capsule_de', { prenom: prenomDe(c.auteur) })} · {t('capsule_ecrite_le', { date: formaterDate(c.cree_le, langue) })}
                        </span>
                        {!c.lue_le && <span className="capsule-carte__pastille capsule-carte__pastille--or">{t('capsule_nouvelle')}</span>}
                      </div>
                      {c.lue_le ? (
                        <p className="capsule-carte__texte capsule-carte__texte--apercu">{c.texte}</p>
                      ) : (
                        <p className="capsule-carte__appel">{t('capsule_toucher_pour_ouvrir')}</p>
                      )}
                    </button>
                  ))}
                </>
              )}
            </>
          )
        )}

        {onglet === 'envoyees' && (
          envoyees.length === 0 ? (
            <Vide
              titre={t('capsules_envoyees_vide_titre')}
              texte={t('capsules_envoyees_vide_texte', { prenom: partenaire?.prenom || '' })}
            />
          ) : (
            envoyees.map((c) => (
              <article className="capsule-carte" key={c.id}>
                <div className="capsule-carte__entete">
                  <span className="capsule-carte__icone"><IconeEnveloppe ouverte={!c.scellee} /></span>
                  <span className="capsule-carte__meta">
                    {t('capsule_pour', { prenom: prenomDe(c.destinataire) })}
                    {c.surprise && ` · ${t('capsule_surprise')}`}
                  </span>
                  {c.scellee && <span className="capsule-carte__pastille"><IconeCadenas /> {tempsRestant(c.ouvre_le, langue)}</span>}
                </div>
                <p className="capsule-carte__texte">{c.texte}</p>
                <div className="capsule-carte__pied">
                  <span className="capsule-carte__date">
                    {c.scellee
                      ? t('capsule_souvre_le', { date: formaterDateHeure(c.ouvre_le, langue) })
                      : c.lue_le
                        ? t('capsule_lue_le', { prenom: prenomDe(c.destinataire), date: formaterDate(c.lue_le, langue) })
                        : t('capsule_ouverte_pas_lue', { prenom: prenomDe(c.destinataire) })}
                  </span>
                  {c.scellee && (
                    <button className="requete-carte__suppr" onClick={() => supprimer(c)} aria-label={t('capsule_retirer_aria')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></svg>
                    </button>
                  )}
                </div>
              </article>
            ))
          )
        )}
      </div>

      {peutEcrire && (
        <button className="fab fab--demander fab--capsule" onClick={() => setEcriture(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          {t('capsule_ecrire')}
        </button>
      )}

      {ecriture && (
        <PanneauCapsule
          prenomPartenaire={partenaire?.prenom}
          onFermer={() => setEcriture(false)}
          onCreer={async (donnees) => {
            await onCreer(donnees)
            setEcriture(false)
            setOnglet(partenaire ? 'envoyees' : 'recues')
          }}
        />
      )}

      {lecture && (
        <Panneau onFermer={() => setLecture(null)} labelAria={t('capsule_lecture_aria')}>
          <span className="sheet-achat__source">
            {t('capsule_de', { prenom: prenomDe(lecture.auteur) })} · {t('capsule_ecrite_le', { date: formaterDate(lecture.cree_le, langue) })}
          </span>
          <p className="capsule-lecture__texte">{lecture.texte}</p>
          <p className="capsule-lecture__meta">{t('capsule_ouverte_le', { date: formaterDate(lecture.ouvre_le, langue) })}</p>
          <button className="btn--navy" onClick={() => setLecture(null)}>{t('fermer')}</button>
        </Panneau>
      )}
    </div>
  )
}

const RACCOURCIS = [
  { cle: 'capsule_dans_1_mois', mois: 1 },
  { cle: 'capsule_dans_6_mois', mois: 6 },
  { cle: 'capsule_dans_1_an', mois: 12 }
]

function PanneauCapsule({ prenomPartenaire, onFermer, onCreer }) {
  const { t } = useLangue()
  const [texte, setTexte] = useState('')
  const [date, setDate] = useState(dansMois(1))
  const [heure, setHeure] = useState('09:00')
  const [surprise, setSurprise] = useState(false)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const demain = new Date()
  demain.setDate(demain.getDate() + 1)

  const valider = async () => {
    if (!texte.trim()) { setErreur(t('capsule_texte_manquant')); return }
    const ouvre = new Date(`${date}T${heure || '09:00'}`)
    if (Number.isNaN(ouvre.getTime()) || ouvre.getTime() <= Date.now() + 60e3) {
      setErreur(t('capsule_date_future'))
      return
    }
    setEnvoi(true)
    setErreur('')
    try {
      await onCreer({ texte: texte.trim(), ouvreLe: ouvre.toISOString(), surprise })
    } catch (err) {
      setErreur(t(err.message) || t('erreur_generique'))
      setEnvoi(false)
    }
  }

  return (
    <Panneau onFermer={onFermer} labelAria={t('capsule_nouvelle_titre')}>
      <h2>{prenomPartenaire ? t('capsule_pour_titre', { prenom: prenomPartenaire }) : t('capsule_nouvelle_titre')}</h2>
      <p className="capsule-panneau__intro">{t('capsule_intro')}</p>

      <div className="field">
        <label>{t('capsule_message_label')}</label>
        <textarea
          autoFocus
          rows={5}
          maxLength={2000}
          value={texte}
          placeholder={t('capsule_placeholder')}
          onChange={(e) => setTexte(e.target.value)}
        />
        <span className="meta capsule-panneau__compteur">{texte.length}/2000</span>
      </div>

      <div className="field">
        <label>{t('capsule_quand_label')}</label>
        <div className="price-stepper__raccourcis capsule-panneau__raccourcis">
          {RACCOURCIS.map((r) => {
            const valeur = dansMois(r.mois)
            return (
              <button key={r.cle} aria-pressed={date === valeur} onClick={() => setDate(valeur)}>
                {t(r.cle)}
              </button>
            )
          })}
        </div>
        <div className="capsule-panneau__date">
          <input type="date" value={date} min={versChampDate(demain)} onChange={(e) => setDate(e.target.value)} aria-label={t('capsule_date_aria')} />
          <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} aria-label={t('capsule_heure_aria')} />
        </div>
      </div>

      {prenomPartenaire && (
        <div className="reglage-ligne capsule-panneau__surprise">
          <div>
            <p className="reglage-ligne__label">{t('capsule_surprise')}</p>
            <p className="reglage-ligne__desc">
              {surprise
                ? t('capsule_surprise_oui', { prenom: prenomPartenaire })
                : t('capsule_surprise_non', { prenom: prenomPartenaire })}
            </p>
          </div>
          <Switch actif={surprise} onChange={() => setSurprise((s) => !s)} label={t('capsule_surprise')} />
        </div>
      )}

      {erreur && <p className="capsule-panneau__erreur" role="alert">{erreur}</p>}

      <button className="btn--navy" disabled={envoi || !texte.trim()} onClick={valider}>
        {envoi ? t('un_instant') : t('capsule_sceller')}
      </button>
    </Panneau>
  )
}
