import { useMemo, useState } from 'react'
import { TYPES } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { CarteEnvie, Vide, BoutonProfil } from '../components/Commun'
import { BarreFiltres } from '../components/BarreFiltres'

export default function AFaireEcran({ items, onOuvrir, onBasculer, avatarUrl, onOuvrirProfil, onOuvrirCalendrier }) {
  const { t, tn } = useLangue()
  const [tri, setTri] = useState('date')
  const [tagsSelectionnes, setTagsSelectionnes] = useState([])
  const restants = items.filter((i) => !i.fait)

  const TRIS = [
    { cle: 'date', libelle: t('trier_date') },
    { cle: 'type', libelle: t('trier_type') }
  ]

  const tagsDisponibles = useMemo(
    () => [...new Set(restants.flatMap((i) => i.tags || []))].sort((a, b) => a.localeCompare(b)),
    [restants]
  )

  const basculerTag = (tag) =>
    setTagsSelectionnes((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]))

  const visibles = restants.filter(
    (i) => tagsSelectionnes.length === 0 || tagsSelectionnes.some((tag) => i.tags?.includes(tag))
  )

  const planifiees = visibles
    .filter((i) => i.date_prevue)
    .sort((a, b) => new Date(a.date_prevue) - new Date(b.date_prevue))
  const sansDate = visibles
    .filter((i) => !i.date_prevue)
    .sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le))

  const groupes = Object.keys(TYPES)
    .map((cle) => ({ cle, label: t(`type_${cle}`), liste: visibles.filter((i) => i.type === cle) }))
    .filter((g) => g.liste.length > 0)

  return (
    <div className="screen">
      <div style={{ position: 'relative' }}>
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
        {onOuvrirCalendrier && (
          <button className="calendrier-ouvrir" onClick={onOuvrirCalendrier} aria-label={t('calendrier_aria')}>
            📅
          </button>
        )}
        <h1 className="header__title" style={{ fontSize: 44, textAlign: 'center', marginBottom: 6 }}>
          {t('afaire_titre')}
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--cream-dim)', fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          {restants.length === 0 ? t('afaire_tout_coche') : tn('afaire_attente', restants.length)}
        </p>
      </div>

      {restants.length > 0 && (
        <BarreFiltres
          triOptions={TRIS}
          tri={tri}
          onTri={setTri}
          tagsDisponibles={tagsDisponibles}
          tagsSelectionnes={tagsSelectionnes}
          onBasculerTag={basculerTag}
          onEffacerTags={() => setTagsSelectionnes([])}
        />
      )}

      {restants.length === 0 ? (
        <Vide titre={t('afaire_vide_titre')} texte={t('afaire_vide_texte')} />
      ) : visibles.length === 0 ? (
        <Vide titre={t('filtre_vide_titre')} texte={t('filtre_vide_texte')} />
      ) : tri === 'date' ? (
        <>
          {planifiees.length > 0 && (
            <section>
              <h2 className="section-label">{t('prochainement')}</h2>
              {planifiees.map((item) => (
                <CarteEnvie key={item.id} item={item} onOuvrir={onOuvrir} onBasculer={onBasculer} />
              ))}
            </section>
          )}
          {sansDate.length > 0 && (
            <section>
              {planifiees.length > 0 && <h2 className="section-label">{t('sans_date')}</h2>}
              {sansDate.map((item) => (
                <CarteEnvie key={item.id} item={item} onOuvrir={onOuvrir} onBasculer={onBasculer} />
              ))}
            </section>
          )}
        </>
      ) : (
        groupes.map((g) => (
          <section key={g.cle}>
            <h2 className="section-label">{g.label}</h2>
            {g.liste.map((item) => (
              <CarteEnvie key={item.id} item={item} onOuvrir={onOuvrir} onBasculer={onBasculer} />
            ))}
          </section>
        ))
      )}
    </div>
  )
}
