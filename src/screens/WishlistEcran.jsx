import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { CarteEnvie, Vide, BoutonProfil } from '../components/Commun'

export default function WishlistEcran({ items, onOuvrir, onBasculer, avatarUrl, onOuvrirProfil }) {
  const { t } = useLangue()
  const [filtre, setFiltre] = useState('tous')

  const FILTRES = [
    { cle: 'tous', libelle: t('filtre_tous') },
    { cle: 'afaire', libelle: t('filtre_afaire') },
    { cle: 'faits', libelle: t('filtre_faits') }
  ]

  const visibles = items.filter((i) =>
    filtre === 'tous' ? true : filtre === 'afaire' ? !i.fait : i.fait
  )

  return (
    <div className="screen">
      <div style={{ position: 'relative' }}>
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
        <h1 className="header__title" style={{ fontSize: 44, textAlign: 'center', marginBottom: 20 }}>
          {t('wishlist_titre')}
        </h1>
      </div>

      <div className="segmented" role="group" aria-label={t('filtrer_aria')}>
        {FILTRES.map((f) => (
          <button
            key={f.cle}
            aria-pressed={filtre === f.cle}
            onClick={() => setFiltre(f.cle)}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Vide
          titre={filtre === 'faits' ? t('vide_faits_titre') : t('wishlist_vide_titre')}
          texte={filtre === 'faits' ? t('vide_faits_texte') : t('wishlist_vide_texte')}
        />
      ) : (
        visibles.map((item) => (
          <CarteEnvie key={item.id} item={item} onOuvrir={onOuvrir} onBasculer={onBasculer} />
        ))
      )}
    </div>
  )
}
