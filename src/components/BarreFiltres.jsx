import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { IconeFiltre } from './Commun'
import { Panneau } from './Panneaux'

// Barre compacte (résumé + bouton) qui ouvre un panneau unique regroupant
// statut, tri/sens et étiquettes — plutôt que d'empiler ces contrôles à même
// l'écran, ce qui devenait illisible une fois les étiquettes ajoutées.
export function BarreFiltres({
  resume,
  statutOptions, statut, onStatut,
  triOptions, tri, onTri,
  direction, onDirection,
  tagsDisponibles, tagsSelectionnes, onBasculerTag, onEffacerTags
}) {
  const { t } = useLangue()
  const [ouvert, setOuvert] = useState(false)

  const nbActifs =
    (tagsSelectionnes?.length || 0) + (statutOptions && statut !== statutOptions[0]?.cle ? 1 : 0)

  return (
    <>
      <button className="filtres-barre" onClick={() => setOuvert(true)}>
        {resume && <span className="filtres-barre__resume">{resume}</span>}
        <span className="filtres-barre__action">
          <IconeFiltre />
          {t('filtres')}
          {nbActifs > 0 && <span className="filtres-barre__badge">{nbActifs}</span>}
        </span>
      </button>

      {ouvert && (
        <Panneau onFermer={() => setOuvert(false)}>
          <h2>{t('filtres')}</h2>

          {statutOptions && (
            <div className="field">
              <label>{t('statut_label')}</label>
              <div className="choice" role="group" aria-label={t('filtrer_aria')}>
                {statutOptions.map((o) => (
                  <button key={o.cle} aria-pressed={statut === o.cle} onClick={() => onStatut(o.cle)}>
                    {o.libelle}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>{t('trier_aria')}</label>
            <div className="tri-ligne">
              <div className="choice" role="group" style={{ flex: 1 }}>
                {triOptions.map((o) => (
                  <button key={o.cle} aria-pressed={tri === o.cle} onClick={() => onTri(o.cle)}>
                    {o.libelle}
                  </button>
                ))}
              </div>
              {onDirection && (
                <button
                  className="tri-sens tri-sens--sheet"
                  onClick={onDirection}
                  aria-label={t('trier_sens_aria')}
                  title={direction === 'asc' ? t('trier_croissant') : t('trier_decroissant')}
                >
                  {direction === 'asc' ? '↑' : '↓'}
                </button>
              )}
            </div>
          </div>

          {tagsDisponibles?.length > 0 && (
            <div className="field">
              <label>{t('etiquettes')}</label>
              <div className="card__tags">
                {tagsDisponibles.map((tag) => (
                  <button
                    key={tag}
                    className={`tag${tagsSelectionnes.includes(tag) ? ' tag--actif' : ''}`}
                    onClick={() => onBasculerTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {tagsSelectionnes.length > 0 && (
                <button className="meta" style={{ marginTop: 8 }} onClick={onEffacerTags}>
                  {t('effacer_etiquettes')}
                </button>
              )}
            </div>
          )}

          <button className="btn" onClick={() => setOuvert(false)}>{t('appliquer')}</button>
        </Panneau>
      )}
    </>
  )
}
