import { TYPES } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { CarteEnvie, Vide, BoutonProfil } from '../components/Commun'

export default function AFaireEcran({ items, onOuvrir, onBasculer, avatarUrl, onOuvrirProfil }) {
  const { t, tn } = useLangue()
  const restants = items.filter((i) => !i.fait)

  const planifiees = restants
    .filter((i) => i.date_prevue)
    .sort((a, b) => new Date(a.date_prevue) - new Date(b.date_prevue))
  const sansDate = restants.filter((i) => !i.date_prevue)

  const groupes = Object.keys(TYPES)
    .map((cle) => ({ cle, label: t(`type_${cle}`), liste: sansDate.filter((i) => i.type === cle) }))
    .filter((g) => g.liste.length > 0)

  return (
    <div className="screen">
      <div style={{ position: 'relative' }}>
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
        <h1 className="header__title" style={{ fontSize: 44, textAlign: 'center', marginBottom: 6 }}>
          {t('afaire_titre')}
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--cream-dim)', fontSize: 14, marginTop: 0, marginBottom: 24 }}>
          {restants.length === 0 ? t('afaire_tout_coche') : tn('afaire_attente', restants.length)}
        </p>
      </div>

      {restants.length === 0 ? (
        <Vide titre={t('afaire_vide_titre')} texte={t('afaire_vide_texte')} />
      ) : (
        <>
          {planifiees.length > 0 && (
            <section>
              <h2 className="section-label">{t('prochainement')}</h2>
              {planifiees.map((item) => (
                <CarteEnvie key={item.id} item={item} onOuvrir={onOuvrir} onBasculer={onBasculer} />
              ))}
            </section>
          )}
          {groupes.map((g) => (
            <section key={g.cle}>
              <h2 className="section-label">{g.label}</h2>
              {g.liste.map((item) => (
                <CarteEnvie key={item.id} item={item} onOuvrir={onOuvrir} onBasculer={onBasculer} />
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  )
}
