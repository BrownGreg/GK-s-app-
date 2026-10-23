import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { TYPES } from '../lib/store'
import { Panneau } from './Panneaux'

const MAX_POINTS = 4

// Lundi en premier, comme le reste de l'Europe.
const JOURS_SEMAINE_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const JOURS_SEMAINE_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// En heure locale, pas .toISOString() (UTC) : sinon un fuseau décalé fait
// glisser le point d'un jour sur la grille, qui elle est construite en local.
function clePourJour(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export function PanneauCalendrier({ items, onFermer, onOuvrir }) {
  const { t, langue } = useLangue()
  const [mois, setMois] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [jourChoisi, setJourChoisi] = useState(null) // Date, ou null

  const parJour = {}
  items.filter((i) => i.date_prevue).forEach((i) => {
    const cle = clePourJour(new Date(i.date_prevue))
    if (!parJour[cle]) parJour[cle] = []
    parJour[cle].push(i)
  })

  const annee = mois.getFullYear()
  const moisIdx = mois.getMonth()
  const premierJourSemaine = (new Date(annee, moisIdx, 1).getDay() + 6) % 7 // lundi = 0
  const nbJours = new Date(annee, moisIdx + 1, 0).getDate()
  const cases = [
    ...Array(premierJourSemaine).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => new Date(annee, moisIdx, i + 1))
  ]

  const aujourdhui = clePourJour(new Date())
  const joursSemaine = langue === 'fr' ? JOURS_SEMAINE_FR : JOURS_SEMAINE_EN
  const nomMois = mois.toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })

  const cleJourChoisi = jourChoisi && clePourJour(jourChoisi)
  const enviesDuJour = cleJourChoisi ? parJour[cleJourChoisi] || [] : []

  return (
    <Panneau onFermer={onFermer}>
      <h2 style={{ textTransform: 'capitalize' }}>{nomMois}</h2>

      <div className="calendrier__nav">
        <button onClick={() => { setMois(new Date(annee, moisIdx - 1, 1)); setJourChoisi(null) }} aria-label={t('mois_precedent_aria')}>
          ‹
        </button>
        <button onClick={() => { setMois(new Date(annee, moisIdx, 1)); setJourChoisi(null) }}>
          {t('aujourdhui')}
        </button>
        <button onClick={() => { setMois(new Date(annee, moisIdx + 1, 1)); setJourChoisi(null) }} aria-label={t('mois_suivant_aria')}>
          ›
        </button>
      </div>

      <div className="calendrier__grille calendrier__grille--entete">
        {joursSemaine.map((j, i) => <span key={i}>{j}</span>)}
      </div>

      <div className="calendrier__grille">
        {cases.map((date, i) => {
          if (!date) return <span key={i} />
          const cle = clePourJour(date)
          const items = parJour[cle] || []
          return (
            <button
              key={i}
              className={[
                cle === aujourdhui ? 'auj' : '',
                cle === cleJourChoisi ? 'choisi' : '',
                items.length > 0 ? 'avec-envie' : ''
              ].filter(Boolean).join(' ')}
              onClick={() => setJourChoisi(cle === cleJourChoisi ? null : date)}
            >
              {date.getDate()}
              {items.length > 0 && (
                <span className="calendrier__points">
                  {items.slice(0, MAX_POINTS).map((it) => (
                    <span
                      key={it.id}
                      className={`calendrier__point ${(TYPES[it.type] || TYPES.activite).dot}`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {jourChoisi && (
        <div className="field" style={{ marginTop: 16 }}>
          <label>
            {jourChoisi.toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </label>
          {enviesDuJour.length === 0 ? (
            <p className="meta">{t('calendrier_rien_ce_jour')}</p>
          ) : (
            enviesDuJour.map((item) => (
              <button key={item.id} className="calendrier__envie" onClick={() => onOuvrir(item)}>
                {item.titre}
              </button>
            ))
          )}
        </div>
      )}

      <button className="btn btn--ghost" onClick={onFermer}>{t('fermer')}</button>
    </Panneau>
  )
}
