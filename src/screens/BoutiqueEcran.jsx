import { useMemo, useState } from 'react'
import { useLangue } from '../lib/i18n'
import { Vide } from '../components/Commun'
import { PointsPill, SegmentedTabs } from '../components/ui'
import { ShopItemCard, SheetAchat } from '../components/Boutique'
import { calculerManque } from '../lib/requetesLogic'

function formaterDate(iso, langue) {
  return new Date(iso).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
}

export default function BoutiqueEcran({
  ongletInitial, profil, partenaire, boutique, achats,
  onFermer, onAcheter, onReclamer, onHonorer,
  onToggleVisibilite, onSupprimerArticle, onNouvelArticle, onEditerArticle
}) {
  const { t, tn, langue } = useLangue()
  const [onglet, setOnglet] = useState(ongletInitial || 'partenaire')
  const [articleChoisi, setArticleChoisi] = useState(null)

  const articlesPartenaire = useMemo(
    () => (partenaire ? boutique.filter((a) => a.proprietaire === partenaire.id && a.actif) : []),
    [boutique, partenaire]
  )
  const mesArticles = useMemo(
    () => boutique.filter((a) => a.proprietaire === profil.id),
    [boutique, profil.id]
  )
  const mesVentes = achats.filter((a) => a.vendeur === profil.id)
  const aHonorer = mesVentes.filter((a) => a.statut === 'claimed')
  const mesAchats = achats.filter((a) => a.acheteur === profil.id)
  const achatsAUtiliser = mesAchats.filter((a) => a.statut === 'ready').length

  return (
    <div className="boutique-ecran">
      <header className="boutique-ecran__entete">
        <button className="boutique-ecran__rond" onClick={onFermer} aria-label={t('retour_aria')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1>{t('boutique_page_titre')}</h1>
        <PointsPill solde={profil.points || 0} labelAria={t('solde_aria')} />
      </header>

      <SegmentedTabs
        fond="navy"
        className="segmented-tabs--ecran"
        labelAria={t('sections_boutique_aria')}
        actif={onglet}
        onChange={setOnglet}
        onglets={[
          { id: 'partenaire', label: partenaire ? t('onglet_chez', { prenom: partenaire.prenom }) : t('onglet_chez_partenaire') },
          { id: 'mine', label: t('boutique_titre') },
          { id: 'achats', label: t('onglet_mes_achats') + (achatsAUtiliser ? ` · ${achatsAUtiliser}` : '') }
        ]}
      />

      <div className="boutique-ecran__corps">
        {onglet === 'partenaire' && (
          partenaire ? (
            articlesPartenaire.length === 0 ? (
              <Vide titre={t('chez_partenaire_vide_titre')} texte={t('chez_partenaire_vide_texte', { prenom: partenaire.prenom })} />
            ) : (
              <>
                <p className="boutique-ecran__intro">{t('chez_partenaire_intro', { prenom: partenaire.prenom })}</p>
                <div className="shop-grille">
                  {articlesPartenaire.map((a) => {
                    const abordable = (profil.points || 0) >= a.prix
                    return (
                      <ShopItemCard
                        key={a.id}
                        article={a}
                        variante="grille"
                        footer={
                          <button
                            className={`shop-carte__achat-bouton${abordable ? '' : ' hors-de-prix'}`}
                            onClick={() => abordable && setArticleChoisi(a)}
                          >
                            {abordable ? t('acheter') : tn('manque_n_pts', calculerManque(a.prix, profil.points))}
                          </button>
                        }
                      />
                    )
                  })}
                </div>
              </>
            )
          ) : (
            <Vide titre={t('pas_de_partenaire_titre')} texte={t('pas_de_partenaire_texte')} />
          )
        )}

        {onglet === 'mine' && (
          <>
            {aHonorer.length > 0 && (
              <section className="a-honorer">
                <h2>{t('a_honorer_titre')}</h2>
                {aHonorer.map((a) => (
                  <div className="a-honorer__ligne" key={a.id}>
                    <div>
                      <span className="a-honorer__nom">{a.titre}</span>
                      <span className="a-honorer__meta">{t('achete_par', { prenom: partenaire?.prenom, date: formaterDate(a.cree_le, langue) })}</span>
                    </div>
                    <button className="btn--navy-petit" onClick={() => onHonorer(a)}>{t('cest_offert')}</button>
                  </div>
                ))}
              </section>
            )}

            <div className="boutique-ecran__section-entete">
              <h2>{t('mes_articles_titre')}</h2>
              <span>{t('mes_articles_compte', { n: mesArticles.filter((a) => a.actif).length, m: mesVentes.length })}</span>
            </div>

            {mesArticles.length === 0 ? (
              <Vide titre={t('boutique_vide_titre')} texte={t('boutique_vide_texte', { prenom: partenaire?.prenom || '' })} />
            ) : (
              mesArticles.map((a) => (
                <ShopItemCard
                  key={a.id}
                  article={a}
                  variante="liste"
                  footer={
                    <>
                      <button
                        role="switch"
                        aria-checked={a.actif}
                        aria-label={t('mettre_en_vente_aria', { titre: a.titre })}
                        className={`switch switch--compact${a.actif ? ' on' : ''}`}
                        onClick={() => onToggleVisibilite(a)}
                      >
                        <span />
                      </button>
                      <button
                        className="boutique-ecran__modifier"
                        aria-label={t('modifier_aria')}
                        onClick={() => onEditerArticle(a)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                      </button>
                    </>
                  }
                />
              ))
            )}
            <button className="boutique-ecran__ajouter" onClick={onNouvelArticle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              {t('boutique_ajouter')}
            </button>
          </>
        )}

        {onglet === 'achats' && (
          mesAchats.length === 0 ? (
            <Vide titre={t('mes_achats_vide_titre')} texte={t('mes_achats_vide_texte')} />
          ) : (
            <>
              <p className="boutique-ecran__intro">{t('mes_achats_intro', { prenom: partenaire?.prenom || '' })}</p>
              {mesAchats.map((a) => (
                <article className={`achat-carte${a.statut === 'honored' ? ' utilise' : ''}`} key={a.id}>
                  <div className="achat-carte__entete">
                    <span className="achat-carte__nom">{a.titre}</span>
                    <span className={`achat-carte__statut achat-carte__statut--${a.statut}`}>
                      {t('statut_' + a.statut)}
                    </span>
                  </div>
                  <span className="achat-carte__meta">
                    {t('achete_le', { date: formaterDate(a.cree_le, langue) })}{a.statut === 'honored' ? ` · ${t('utilise_suffixe')}` : ''}
                  </span>
                  {a.statut === 'ready' && (
                    <button className="btn--navy" onClick={() => onReclamer(a)}>
                      {t('reclamer_a', { prenom: partenaire?.prenom || '' })}
                    </button>
                  )}
                </article>
              ))}
            </>
          )
        )}
      </div>

      {articleChoisi && (
        <SheetAchat
          article={articleChoisi}
          solde={profil.points || 0}
          prenomPartenaire={partenaire?.prenom}
          onFermer={() => setArticleChoisi(null)}
          onAcheter={(a) => { onAcheter(a); setArticleChoisi(null) }}
        />
      )}
    </div>
  )
}
