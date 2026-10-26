import { useMemo, useState } from 'react'
import { useLangue } from '../lib/i18n'
import { Vide, BoutonProfil } from '../components/Commun'
import { PointsPill, SegmentedTabs } from '../components/ui'
import { ShopItemCard, SheetAchat } from '../components/Boutique'
import { PanneauRequete } from '../components/Panneaux'
import { repartirRequetes, calculerManque } from '../lib/requetesLogic'

export default function RequestsEcran({
  requetes, boutique, profil, partenaire,
  onAjouterTodo, onValider, onRelancer, onSupprimer,
  onCreerRequete, onAcheter, onOuvrirBoutique,
  avatarUrl, onOuvrirProfil
}) {
  const { t, tn, langue } = useLangue()
  const [filtre, setFiltre] = useState('pour_toi')
  const [sheetOuvert, setSheetOuvert] = useState(false)
  const [articleChoisi, setArticleChoisi] = useState(null)
  const [achatOuvert, setAchatOuvert] = useState(null)

  const prenomDe = (id) => {
    if (id === profil.id) return profil.prenom
    if (partenaire && id === partenaire.id) return partenaire.prenom
    return ''
  }

  const nomDemandeur = (id) => (id === profil.id ? t('demande_par_vous') : t('demande_par', { prenom: prenomDe(id) }))

  const formaterDate = (iso) =>
    new Date(iso).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })

  const { pourToi, envoyees, faites } = useMemo(() => repartirRequetes(requetes, profil.id), [requetes, profil.id])
  const visibles = filtre === 'pour_toi' ? pourToi : filtre === 'envoyees' ? envoyees : faites

  const articlesPartenaire = useMemo(
    () => (partenaire ? boutique.filter((a) => a.proprietaire === partenaire.id && a.actif) : []),
    [boutique, partenaire]
  )

  const videCopie = {
    pour_toi: ['requetes_vide_pour_toi_titre', 'requetes_vide_pour_toi_texte'],
    envoyees: ['requetes_vide_envoyees_titre', 'requetes_vide_envoyees_texte'],
    faites: ['requetes_vide_faites_titre', 'requetes_vide_faites_texte']
  }[filtre]

  const demander = async (texte, points) => {
    await onCreerRequete(texte, points)
    setSheetOuvert(false)
    setFiltre('envoyees')
  }

  return (
    <div className="screen screen--requests">
      <header className="requests-entete">
        <h1>{t('requests_titre')}</h1>
        <PointsPill solde={profil.points || 0} labelAria={t('solde_aria')} />
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
      </header>

      {partenaire && (
        <section aria-label={t('boutique_de', { prenom: partenaire.prenom })} className="requests-boutique">
          <div className="requests-boutique__entete">
            <h2>{t('boutique_de', { prenom: partenaire.prenom })}</h2>
            <button onClick={onOuvrirBoutique}>{t('tout_voir')}</button>
          </div>
          {articlesPartenaire.length === 0 ? (
            <button className="boutique-carrousel-vide" onClick={onOuvrirBoutique}>
              {t('boutique_partenaire_vide', { prenom: partenaire.prenom })}
            </button>
          ) : (
            <div className="shop-carrousel">
              {articlesPartenaire.map((a) => (
                <ShopItemCard
                  key={a.id}
                  article={a}
                  variante="carrousel"
                  onClick={() => { setArticleChoisi(a); setAchatOuvert(true) }}
                  footer={
                    <span className={`shop-carte__note${(profil.points || 0) >= a.prix ? ' ok' : ''}`}>
                      {(profil.points || 0) >= a.prix
                        ? t('disponible')
                        : tn('il_te_manque', calculerManque(a.prix, profil.points))}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      <SegmentedTabs
        fond="navy"
        className="segmented-tabs--ecran"
        labelAria={t('filtrer_requetes_aria')}
        actif={filtre}
        onChange={setFiltre}
        onglets={[
          { id: 'pour_toi', label: t('filtre_pour_toi'), count: pourToi.length || null },
          { id: 'envoyees', label: t('filtre_envoyees'), count: envoyees.length || null },
          { id: 'faites', label: t('filtre_faites') }
        ]}
      />

      <div className="requests-liste">
        {visibles.length === 0 ? (
          <Vide
            titre={t(videCopie[0])}
            texte={t(videCopie[1], filtre === 'pour_toi' ? { prenom: partenaire?.prenom || '' } : undefined)}
          />
        ) : (
          visibles.map((r) => (
            <article className="requete-carte" key={r.id}>
              <div className="requete-carte__entete">
                <span className={`requete-carte__avatar${r.demande_par === profil.id ? ' moi' : ''}`}>
                  {prenomDe(r.demande_par).charAt(0).toUpperCase()}
                </span>
                <span className="requete-carte__meta">
                  {nomDemandeur(r.demande_par)} · {formaterDate(r.cree_le)}
                </span>
                <span className="requete-carte__points">{tn('points_badge', r.points || 1)}</span>
              </div>

              <p className="requete-carte__texte">{r.texte}</p>

              {r.statut === 'ouverte' && r.demande_par !== profil.id && (
                <div className="requete-carte__boutons">
                  <button className="btn--navy" onClick={() => onValider(r)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                    {t('requete_cest_fait')}
                  </button>
                  <button className="btn--contour" onClick={() => onAjouterTodo(r)}>{t('plus_tard')}</button>
                </div>
              )}

              {r.statut === 'ouverte' && r.demande_par === profil.id && (
                <div className="requete-carte__envoyee">
                  <span className="requete-carte__attente">
                    <span className="requete-carte__puce" />
                    {r.relance_envoyee ? t('relance_envoyee') : t('en_attente_de', { prenom: partenaire?.prenom })}
                  </span>
                  <button className="btn--contour-petit" disabled={r.relance_envoyee} onClick={() => onRelancer(r)}>
                    {t('relancer')}
                  </button>
                  <button
                    className="requete-carte__suppr"
                    onClick={() => onSupprimer(r.id)}
                    aria-label={t('annuler_requete_aria')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></svg>
                  </button>
                </div>
              )}

              {r.statut === 'ajoutee' && (
                <div className="requete-carte__boutons">
                  <span className="requete-carte__tag">{t('dans_todo')}</span>
                  {r.demande_par !== profil.id && (
                    <button className="btn--contour-petit" onClick={() => onValider(r)}>{t('requete_cest_fait')}</button>
                  )}
                  <button className="btn--contour-petit" onClick={() => onSupprimer(r.id)}>{t('retirer_requete')}</button>
                </div>
              )}

              {r.statut === 'validee' && (
                <span className="requete-carte__fait">
                  {r.valide_par === profil.id ? t('fait_par_vous') : t('fait_par', { prenom: prenomDe(r.valide_par) })}
                  {' '}{tn('points_badge', r.points || 1)}
                </span>
              )}
            </article>
          ))
        )}
      </div>

      <button className="fab fab--demander" onClick={() => setSheetOuvert(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        {t('demander_cta_court')}
      </button>

      {sheetOuvert && (
        <PanneauRequete
          onFermer={() => setSheetOuvert(false)}
          onCreer={demander}
          prenomPartenaire={partenaire?.prenom}
        />
      )}

      {achatOuvert && articleChoisi && (
        <SheetAchat
          article={articleChoisi}
          solde={profil.points || 0}
          prenomPartenaire={partenaire?.prenom}
          onFermer={() => setAchatOuvert(false)}
          onAcheter={(a) => { onAcheter(a); setAchatOuvert(false) }}
        />
      )}
    </div>
  )
}
