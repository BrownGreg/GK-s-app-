import { useMemo, useState } from 'react'
import { useLangue } from '../lib/i18n'
import { Vide, BoutonProfil } from '../components/Commun'
import { CarrouselBoutique, PanneauMaBoutique } from '../components/Boutique'

function prochaineRecompense(articles, points) {
  if (!articles.length) return null
  const tries = [...articles].sort((a, b) => a.prix - b.prix)
  const inaccessible = tries.find((a) => a.prix > points)
  if (inaccessible) return { article: inaccessible, debloquee: false }
  return { article: tries[tries.length - 1], debloquee: true }
}

export default function RequestsEcran({
  requetes, boutique, profil, partenaire,
  onAjouterTodo, onValider, onSupprimer,
  onCreerRequete, onCreerArticle, onSupprimerArticle, onAcheter,
  avatarUrl, onOuvrirProfil
}) {
  const { t, tn, langue } = useLangue()
  const [filtre, setFiltre] = useState('pour_toi')
  const [maBoutiqueOuverte, setMaBoutiqueOuverte] = useState(false)

  const prenomDe = (id) => {
    if (id === profil.id) return profil.prenom
    if (partenaire && id === partenaire.id) return partenaire.prenom
    return ''
  }

  const nomDemandeur = (id) => {
    if (id === profil.id) return t('demande_par_vous')
    return t('demande_par', { prenom: prenomDe(id) })
  }

  const formaterDate = (iso) =>
    new Date(iso).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })

  const pourToi = requetes.filter((r) => r.statut === 'ouverte' && r.demande_par !== profil.id)
  const envoyees = requetes.filter((r) => r.statut === 'ouverte' && r.demande_par === profil.id)
  const faites = requetes.filter((r) => r.statut === 'ajoutee' || r.statut === 'validee')

  const visibles = filtre === 'pour_toi' ? pourToi : filtre === 'envoyees' ? envoyees : faites

  const mesArticles = useMemo(
    () => boutique.filter((a) => a.proprietaire === profil.id),
    [boutique, profil.id]
  )
  const articlesPartenaire = useMemo(
    () => (partenaire ? boutique.filter((a) => a.proprietaire === partenaire.id) : []),
    [boutique, partenaire]
  )

  const recompense = partenaire ? prochaineRecompense(articlesPartenaire, profil.points || 0) : null

  return (
    <div className="screen">
      <div style={{ position: 'relative' }}>
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
        <h1 className="header__title" style={{ fontSize: 44, textAlign: 'center', marginBottom: 20 }}>
          {t('requests_titre')}
        </h1>
      </div>

      <div className="points-carte">
        <div className="points-carte__personne">
          <span className="points-carte__avatar">
            {profil.avatar_url ? <img src={profil.avatar_url} alt="" /> : (profil.prenom || '?')[0]}
          </span>
          <div>
            <span className="points-carte__label">{t('profil_toi')}</span>
            <strong>{tn('points', profil.points || 0)}</strong>
          </div>
        </div>
        {partenaire && (
          <div className="points-carte__personne points-carte__personne--droite">
            <div>
              <span className="points-carte__label">{partenaire.prenom}</span>
              <strong>{tn('points', partenaire.points || 0)}</strong>
            </div>
            <span className="points-carte__avatar points-carte__avatar--sombre">
              {partenaire.avatar_url ? <img src={partenaire.avatar_url} alt="" /> : (partenaire.prenom || '?')[0]}
            </span>
          </div>
        )}
      </div>

      {partenaire && recompense && (
        <div className="recompense-carte">
          <div className="recompense-carte__entete">
            <span>{t('prochaine_recompense')} · {recompense.article.titre}</span>
            <span>{Math.min(profil.points || 0, recompense.article.prix)}/{recompense.article.prix}</span>
          </div>
          <div className="recompense-carte__barre">
            <div
              className="recompense-carte__remplissage"
              style={{ width: `${Math.min(100, ((profil.points || 0) / recompense.article.prix) * 100)}%` }}
            />
          </div>
          <p className="recompense-carte__texte">
            {recompense.debloquee
              ? t('recompense_debloquee')
              : tn('encore_points_pour_debloquer', recompense.article.prix - (profil.points || 0))}
          </p>
        </div>
      )}

      {partenaire && (
        <>
          <h3 className="profil-section__titre" style={{ marginTop: 10 }}>
            {t('boutique_carousel_titre', { prenom: partenaire.prenom })}
          </h3>
          <CarrouselBoutique
            articles={articlesPartenaire}
            points={profil.points || 0}
            onAcheter={onAcheter}
            prenom={partenaire.prenom}
          />
        </>
      )}

      <button className="lien-boutique" onClick={() => setMaBoutiqueOuverte(true)}>
        {t('gerer_ma_boutique')}
      </button>

      <div className="choice" style={{ marginTop: 20 }}>
        <button aria-pressed={filtre === 'pour_toi'} onClick={() => setFiltre('pour_toi')}>
          {t('filtre_pour_toi')} · {pourToi.length}
        </button>
        <button aria-pressed={filtre === 'envoyees'} onClick={() => setFiltre('envoyees')}>
          {t('filtre_envoyees')} · {envoyees.length}
        </button>
        <button aria-pressed={filtre === 'faites'} onClick={() => setFiltre('faites')}>
          {t('filtre_faites')}
        </button>
      </div>

      {visibles.length === 0 ? (
        <Vide titre={t('requests_vide_titre')} texte={t('requests_vide_texte')} />
      ) : (
        visibles.map((r) => (
          <div className="requete-card" key={r.id}>
            <div className="requete-card__entete">
              <p className="requete-card__auteur">
                {nomDemandeur(r.demande_par)}{r.cree_le && ` · ${formaterDate(r.cree_le)}`}
              </p>
              {r.statut === 'ouverte' && <span className="requete-card__points">{tn('points_badge', r.points || 1)}</span>}
            </div>

            <p className="requete-card__texte">{r.texte}</p>

            {r.statut === 'ajoutee' && <span className="requete-card__tag">{t('dans_todo')}</span>}

            <div className="requete-card__actions">
              {(r.statut === 'ouverte' || r.statut === 'ajoutee') && (
                <>
                  <button className="btn" style={{ marginTop: 0 }} onClick={() => onValider(r)}>
                    ✓ {t('requete_cest_fait')}
                  </button>
                  {r.statut === 'ouverte' ? (
                    <button className="btn btn--ghost" style={{ marginTop: 0 }} onClick={() => onAjouterTodo(r)}>
                      ⏱ {t('plus_tard')}
                    </button>
                  ) : (
                    <button className="btn btn--ghost" style={{ marginTop: 0 }} onClick={() => onSupprimer(r.id)}>
                      {t('retirer_requete')}
                    </button>
                  )}
                </>
              )}
              {r.statut === 'validee' && (
                <span className="requete-card__statut">
                  {t('requete_validee_par', { prenom: prenomDe(r.valide_par) })} {tn('points_badge', r.points || 1)}
                </span>
              )}
              {r.statut !== 'ajoutee' && (
                <button
                  className="requete-card__suppr"
                  onClick={() => onSupprimer(r.id)}
                  aria-label={t('supprimer_requete')}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))
      )}

      <button className="btn btn--gold" onClick={onCreerRequete}>{t('demander_cta')}</button>

      {maBoutiqueOuverte && (
        <PanneauMaBoutique
          articles={mesArticles}
          onCreer={onCreerArticle}
          onSupprimer={onSupprimerArticle}
          onFermer={() => setMaBoutiqueOuverte(false)}
          prenomPartenaire={partenaire?.prenom}
        />
      )}
    </div>
  )
}
