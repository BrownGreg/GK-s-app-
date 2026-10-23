import { TYPES, moyenneNote } from '../lib/store'
import { useLangue } from '../lib/i18n'

// L'app change de nom à chaque rechargement — tiré une seule fois par
// chargement de page (portée module), pas à chaque rendu.
const NOMS_APP = ['Nous deux', 'Wtd (what to do 😂)', "GK's app"]
const nomApp = NOMS_APP[Math.floor(Math.random() * NOMS_APP.length)]
document.title = nomApp

export function BoutonProfil({ avatarUrl, onClick }) {
  const { t } = useLangue()
  return (
    <button className="header__profil" onClick={onClick} title={t('votre_profil')} aria-label={t('votre_profil')}>
      {avatarUrl ? <img src={avatarUrl} alt="" /> : <IconeProfil />}
    </button>
  )
}

export function Entete({ phrase, onEditPhrase, avatarUrl, onOuvrirProfil }) {
  const { t } = useLangue()
  return (
    <header className="header">
      {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
      {onEditPhrase && (
        <button
          className="header__phrase"
          onClick={onEditPhrase}
          title={t('phrase_modifier')}
        >
          {phrase || t('phrase_defaut')}
        </button>
      )}
      <div className="header__rule">
        <span /> <IconeCoeur /> <span />
      </div>
      <h1 className="header__title" style={{ fontSize: nomApp.length > 12 ? 34 : 58 }}>{nomApp}</h1>
    </header>
  )
}

export function Etoiles({ note, vide = false }) {
  return (
    <div className={`stars${vide ? ' stars--empty' : ''}`} aria-label={`${note}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= note ? '★' : '☆'}</span>
      ))}
    </div>
  )
}

export function CarteEnvie({ item, onOuvrir, onBasculer }) {
  const { t, langue } = useLangue()
  const type = TYPES[item.type] || TYPES.activite
  const moyenne = moyenneNote(item)
  return (
    <div className="card">
      <button className="card__body" onClick={() => onOuvrir(item)}>
        <div className="card__type">
          <span className={`dot ${type.dot}`} />
          {t(`type_${item.type}`)}
        </div>
        <h2 className="card__title">{item.titre}</h2>
        {!item.fait && item.date_prevue && (
          <p className="card__date">
            📅 {formaterDateHeure(item.date_prevue, langue)}
            {item.date_fin && ` → ${formaterDateHeure(item.date_fin, langue)}`}
          </p>
        )}
        {item.description && <p className="card__desc">{item.description}</p>}
        {item.tags?.length > 0 && (
          <div className="card__tags">
            {item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
        )}
      </button>
      <div className="card__side">
        <button
          className={`status status--${item.fait ? 'done' : 'todo'}`}
          onClick={() => onBasculer(item)}
        >
          {item.fait ? t('statut_fait') : t('statut_afaire')}
        </button>
        {item.fait && <Etoiles note={Math.round(moyenne)} vide={moyenne === 0} />}
      </div>
    </div>
  )
}

function formaterDateHeure(iso, langue) {
  const d = new Date(iso)
  const locale = langue === 'fr' ? 'fr-FR' : 'en-US'
  const jour = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  const heure = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return `${jour} · ${heure}`
}

export function Vide({ titre, texte }) {
  return (
    <div className="empty">
      <h3>{titre}</h3>
      <p>{texte}</p>
    </div>
  )
}

export function BarreOnglets({ actif, onChange, aFaire, requetes }) {
  const { t } = useLangue()
  const onglets = [
    { cle: 'carte', libelle: t('onglet_carte'), icone: <IconePin /> },
    { cle: 'liste', libelle: t('onglet_liste'), icone: <IconeListe /> },
    { cle: 'afaire', libelle: t('onglet_afaire'), icone: <IconeCheck />, badge: aFaire },
    { cle: 'wishlist', libelle: t('onglet_wishlist'), icone: <IconeEtoile /> },
    { cle: 'requests', libelle: t('onglet_requests'), icone: <IconeBulle />, badge: requetes }
  ]
  return (
    <nav className="tabbar">
      {onglets.map((o) => (
        <button
          key={o.cle}
          onClick={() => onChange(o.cle)}
          aria-current={actif === o.cle ? 'page' : undefined}
        >
          {o.icone}
          {o.libelle}
          {o.badge > 0 && actif !== o.cle && <span className="badge">{o.badge}</span>}
        </button>
      ))}
    </nav>
  )
}

/* ---------- Icônes ---------- */

const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function IconeCoeur() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 3.5C19 15.5 12 20 12 20z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconeProfil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8.3" r="3.4" {...trait} />
      <path d="M5 20c0.8-4 3.4-6 7-6s6.2 2 7 6" {...trait} />
    </svg>
  )
}

function IconePin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" {...trait} />
      <circle cx="12" cy="10" r="2.4" {...trait} />
    </svg>
  )
}

function IconeListe() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" {...trait} />
      <circle cx="4.5" cy="6" r="1.4" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.4" fill="currentColor" />
    </svg>
  )
}

function IconeCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" {...trait} />
      <path d="M8.2 12.3l2.6 2.6 5-5.2" {...trait} />
    </svg>
  )
}

function IconeEtoile() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8 2.6-5.4z" {...trait} />
    </svg>
  )
}

function IconeBulle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v11H9.5L5 20v-4H4V5z" {...trait} />
      <path d="M11 9.4c0-1.1.9-1.7 1.9-1.7s1.9.6 1.9 1.6c0 .9-.6 1.2-1.2 1.6-.5.3-.9.6-.9 1.2" {...trait} />
      <circle cx="12.7" cy="14" r="0.7" fill="currentColor" />
    </svg>
  )
}

export function IconeFiltre() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M7.5 12h9M11 18h2" {...trait} />
    </svg>
  )
}

export function IconeLoupe() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" {...trait} />
      <path d="M16 16l4.5 4.5" {...trait} />
    </svg>
  )
}
