// Petits composants partagés par Demandes / Boutique / Nouvel article —
// EmptyState existe déjà ailleurs (voir `Vide` dans Commun.jsx), Toast
// réutilise le mécanisme déjà en place dans App.jsx (classe .toast).

export function PointsPill({ solde, labelAria }) {
  return (
    <div className="points-pill" aria-label={labelAria}>
      <span className="points-pill__piece" />
      <span className="points-pill__valeur">{solde}</span>
      <span className="points-pill__unite">pts</span>
    </div>
  )
}

export function SegmentedTabs({ onglets, actif, onChange, fond = 'navy', labelAria, className = '' }) {
  return (
    <div
      role="tablist"
      aria-label={labelAria}
      className={`segmented-tabs segmented-tabs--${fond} ${className}`.trim()}
    >
      {onglets.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={actif === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}{o.count != null ? ` · ${o.count}` : ''}
        </button>
      ))}
    </div>
  )
}

export function Switch({ actif, onChange, label, taille = 'normal', disabled = false }) {
  return (
    <button
      role="switch"
      aria-checked={actif}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`switch switch--${taille}${actif ? ' on' : ''}`}
    >
      <span />
    </button>
  )
}

export function PriceStepper({ valeur, onChange, min = 1, max = 99, raccourcis }) {
  return (
    <div className="price-stepper">
      <div className="price-stepper__corps">
        <button
          className="price-stepper__bouton"
          onClick={() => onChange(Math.max(min, valeur - 1))}
          aria-label="Diminuer le prix"
        >
          −
        </button>
        <div className="price-stepper__valeur">
          <span>{valeur}</span>
          <span className="price-stepper__unite">pts</span>
        </div>
        <button
          className="price-stepper__bouton price-stepper__bouton--plus"
          onClick={() => onChange(Math.min(max, valeur + 1))}
          aria-label="Augmenter le prix"
        >
          +
        </button>
      </div>
      {raccourcis && (
        <div className="price-stepper__raccourcis">
          {raccourcis.map((n) => (
            <button key={n} aria-pressed={valeur === n} onClick={() => onChange(n)}>
              {n} pts
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
