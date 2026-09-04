import { useLangue } from '../lib/i18n'
import { Vide, BoutonProfil } from '../components/Commun'

export default function RequestsEcran({ requetes, profil, partenaire, onAjouterTodo, onSupprimer, avatarUrl, onOuvrirProfil }) {
  const { t } = useLangue()

  const nomDemandeur = (id) => {
    if (id === profil.id) return t('demande_par_vous')
    if (partenaire && id === partenaire.id) return t('demande_par', { prenom: partenaire.prenom })
    return ''
  }

  return (
    <div className="screen">
      <div style={{ position: 'relative' }}>
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
        <h1 className="header__title" style={{ fontSize: 44, textAlign: 'center', marginBottom: 20 }}>
          {t('requests_titre')}
        </h1>
      </div>

      {requetes.length === 0 ? (
        <Vide titre={t('requests_vide_titre')} texte={t('requests_vide_texte')} />
      ) : (
        requetes.map((r) => (
          <div className="requete-card" key={r.id}>
            <p className="requete-card__auteur">{nomDemandeur(r.demande_par)}</p>
            <p className="requete-card__texte">{r.texte}</p>
            <div className="requete-card__actions">
              {r.statut === 'ouverte' ? (
                <button className="btn btn--gold" style={{ marginTop: 0 }} onClick={() => onAjouterTodo(r)}>
                  {t('ajouter_todo')}
                </button>
              ) : (
                <span className="requete-card__statut">{t('ajoutee_todo')}</span>
              )}
              <button
                className="requete-card__suppr"
                onClick={() => onSupprimer(r.id)}
                aria-label={t('supprimer_requete')}
              >
                ×
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
