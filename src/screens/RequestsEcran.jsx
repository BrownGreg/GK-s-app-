import { useLangue } from '../lib/i18n'
import { Vide, BoutonProfil } from '../components/Commun'

export default function RequestsEcran({ requetes, profil, partenaire, onAjouterTodo, onValider, onSupprimer, avatarUrl, onOuvrirProfil }) {
  const { t, tn, langue } = useLangue()

  const prenomDe = (id) => {
    if (id === profil.id) return profil.prenom
    if (partenaire && id === partenaire.id) return partenaire.prenom
    return ''
  }

  const nomDemandeur = (id) => {
    if (id === profil.id) return t('demande_par_vous')
    if (partenaire && id === partenaire.id) return t('demande_par', { prenom: partenaire.prenom })
    return ''
  }

  const formaterDate = (iso) =>
    new Date(iso).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="screen">
      <div style={{ position: 'relative' }}>
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
        <h1 className="header__title" style={{ fontSize: 44, textAlign: 'center', marginBottom: 20 }}>
          {t('requests_titre')}
        </h1>
      </div>

      <div className="points-resume">
        <div>
          <span className="points-resume__label">{t('profil_toi')}</span>
          <strong>{tn('points', profil.points || 0)}</strong>
        </div>
        {partenaire && (
          <div>
            <span className="points-resume__label">{partenaire.prenom}</span>
            <strong>{tn('points', partenaire.points || 0)}</strong>
          </div>
        )}
      </div>

      {requetes.length === 0 ? (
        <Vide titre={t('requests_vide_titre')} texte={t('requests_vide_texte')} />
      ) : (
        requetes.map((r) => (
          <div className="requete-card" key={r.id}>
            <p className="requete-card__auteur">
              {nomDemandeur(r.demande_par)}{r.cree_le && ` · ${formaterDate(r.cree_le)}`}
            </p>
            <p className="requete-card__texte">{r.texte}</p>
            <div className="requete-card__actions">
              {r.statut === 'ouverte' && (
                <>
                  <button className="btn btn--gold" style={{ marginTop: 0 }} onClick={() => onAjouterTodo(r)}>
                    {t('ajouter_todo')}
                  </button>
                  {onValider && (
                    <button className="btn" style={{ marginTop: 0 }} onClick={() => onValider(r.id)}>
                      {t('valider_requete')}
                    </button>
                  )}
                </>
              )}
              {r.statut === 'ajoutee' && <span className="requete-card__statut">{t('ajoutee_todo')}</span>}
              {r.statut === 'validee' && (
                <span className="requete-card__statut">
                  {t('requete_validee_par', { prenom: prenomDe(r.valide_par) })}
                </span>
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
