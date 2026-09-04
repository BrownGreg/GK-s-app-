import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { Entete, CarteEnvie, Vide } from '../components/Commun'

export default function ListeEcran({ items, phrase, onEditPhrase, avatarUrl, onOuvrirProfil, onOuvrir, onBasculer }) {
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
      <Entete phrase={phrase} onEditPhrase={onEditPhrase} avatarUrl={avatarUrl} onOuvrirProfil={onOuvrirProfil} />

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
          titre={filtre === 'faits' ? t('vide_faits_titre') : t('vide_liste_titre')}
          texte={filtre === 'faits' ? t('vide_faits_texte') : t('vide_liste_texte')}
        />
      ) : (
        visibles.map((item) => (
          <CarteEnvie key={item.id} item={item} onOuvrir={onOuvrir} onBasculer={onBasculer} />
        ))
      )}
    </div>
  )
}
