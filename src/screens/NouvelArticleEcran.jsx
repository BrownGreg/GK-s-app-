import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { SegmentedTabs, Switch, PriceStepper } from '../components/ui'
import { ItemThumb, ChoixPhotoArticle, COULEURS_VIGNETTE } from '../components/Boutique'

const RACCOURCIS_PRIX = [2, 5, 10, 20]

export default function NouvelArticleEcran({ article, partenaire, onFermer, onCreer, onModifier, onSupprimer }) {
  const { t, tn } = useLangue()
  const estEdition = !!article

  const [visuelType, setVisuelType] = useState(article?.visuel_type || 'couleur')
  const [visuelCouleur, setVisuelCouleur] = useState(article?.visuel_couleur || COULEURS_VIGNETTE[0].valeur)
  const [image, setImage] = useState(article?.image_url || null)
  const [nom, setNom] = useState(article?.titre || '')
  const [description, setDescription] = useState(article?.description || '')
  const [prix, setPrix] = useState(article?.prix || 5)
  const [repetable, setRepetable] = useState(article?.repetable !== false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)
  const [confirmerSuppr, setConfirmerSuppr] = useState(false)

  const peutPublier = nom.trim().length > 0 && prix > 0
  const effortDemandes = Math.ceil(prix / 2)

  const articlePreview = {
    titre: nom,
    visuel_type: visuelType,
    visuel_couleur: visuelCouleur,
    image_url: visuelType === 'photo' ? image : null,
    imageApercu: image
  }

  const publier = async () => {
    if (!peutPublier || envoi) return
    setEnvoi(true)
    setErreur('')
    try {
      const donnees = { titre: nom.trim(), description: description.trim(), prix, visuelType, visuelCouleur, image, repetable }
      if (estEdition) {
        await onModifier(article.id, donnees)
        onFermer()
      } else {
        await onCreer(donnees)
        setSucces(true)
      }
    } catch (e) {
      setErreur(t(e.message) || t('erreur_generique'))
    } finally {
      setEnvoi(false)
    }
  }

  const recommencer = () => {
    setSucces(false)
    setNom('')
    setDescription('')
    setPrix(5)
    setImage(null)
    setVisuelType('couleur')
  }

  const supprimer = async () => {
    setEnvoi(true)
    try {
      await onSupprimer(article.id)
    } catch (e) {
      setErreur(t(e.message) || t('erreur_generique'))
      setEnvoi(false)
    }
  }

  if (succes) {
    return (
      <div className="article-ecran">
        <div className="article-ecran__succes">
          <div className="article-ecran__succes-icone">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
          </div>
          <h2>{t('succes_titre')}</h2>
          <p>{t('succes_texte', { titre: nom || articlePreview.titre, prenom: partenaire?.prenom || '', n: prix })}</p>
          <button className="btn--navy" style={{ marginTop: 8 }} onClick={onFermer}>{t('voir_ma_boutique')}</button>
          <button className="article-ecran__lien" onClick={recommencer}>{t('ajouter_autre_article')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="article-ecran">
      <header className="article-ecran__entete">
        <button aria-label={t('fermer')} onClick={onFermer}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
        </button>
        <h1>{estEdition ? t('modifier_article_titre') : t('nouvel_article_titre')}</h1>
      </header>

      <div className="article-ecran__corps">
        <section className="article-apercu">
          <span>{t('apercu_titre', { prenom: partenaire?.prenom || '' })}</span>
          <div className="shop-carte shop-carte--carrousel">
            <ItemThumb article={articlePreview} variante="carrousel" />
            <div className="shop-carte__corps">
              <span className="shop-carte__titre">{nom || t('nom_article_sans')}</span>
              <span className="shop-carte__prix"><span className="shop-carte__piece" />{prix} pts</span>
            </div>
          </div>
        </section>

        <section className="field">
          <span className="article-ecran__label">{t('visuel_label')} <span className="article-ecran__label-facultatif">· {t('facultatif')}</span></span>
          <SegmentedTabs
            fond="cream"
            labelAria={t('visuel_label')}
            actif={visuelType}
            onChange={setVisuelType}
            onglets={[
              { id: 'photo', label: t('visuel_photo') },
              { id: 'couleur', label: t('visuel_couleur') },
              { id: 'aucun', label: t('visuel_aucun') }
            ]}
          />

          {visuelType === 'photo' && <ChoixPhotoArticle onChoisir={setImage} />}

          {visuelType === 'couleur' && (
            <div role="radiogroup" aria-label={t('couleur_vignette_aria')} className="palette-vignettes">
              {COULEURS_VIGNETTE.map((c) => (
                <button
                  key={c.valeur}
                  role="radio"
                  aria-checked={visuelCouleur === c.valeur}
                  aria-label={c.nom}
                  className={visuelCouleur === c.valeur ? 'on' : ''}
                  style={{ background: c.valeur }}
                  onClick={() => setVisuelCouleur(c.valeur)}
                />
              ))}
            </div>
          )}

          {visuelType === 'aucun' && <p className="meta">{t('visuel_neutre_desc')}</p>}
        </section>

        <div className="field">
          <label htmlFor="nom-article">{t('titre_champ')}</label>
          <input
            id="nom-article"
            maxLength={40}
            value={nom}
            placeholder={t('nom_placeholder')}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="desc-article">{t('ce_que_recevra', { prenom: partenaire?.prenom || '' })}</label>
          <textarea
            id="desc-article"
            rows={3}
            maxLength={140}
            value={description}
            placeholder={t('article_description_placeholder')}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className="article-ecran__compteur">{description.length}/140</span>
        </div>

        <section className="field">
          <span className="article-ecran__label">{t('article_prix_label')}</span>
          <PriceStepper valeur={prix} onChange={setPrix} raccourcis={RACCOURCIS_PRIX} />
          <span className="meta" style={{ marginBottom: 0 }}>
            {t('repere_prix')} {tn('effort_demandes', effortDemandes, { prenom: partenaire?.prenom || '' })}
          </span>
        </section>

        <div className="reglage-ligne reglage-ligne--surcreme">
          <div>
            <p className="reglage-ligne__label">{t('achat_repetable_label')}</p>
            <p className="reglage-ligne__desc">
              {repetable ? t('achat_repetable_oui', { prenom: partenaire?.prenom || '' }) : t('achat_repetable_non')}
            </p>
          </div>
          <Switch actif={repetable} onChange={() => setRepetable((r) => !r)} label={t('achat_repetable_label')} taille="compact" />
        </div>

        {erreur && <p className="erreur-texte">{erreur}</p>}

        {estEdition && (
          confirmerSuppr ? (
            <div className="article-ecran__confirm-suppr">
              <p>{t('confirmer_suppression_article')}</p>
              <div className="requete-carte__boutons">
                <button className="btn--contour-petit" onClick={() => setConfirmerSuppr(false)}>{t('annuler')}</button>
                <button className="btn--navy-petit" onClick={supprimer} disabled={envoi}>{t('supprimer_article')}</button>
              </div>
            </div>
          ) : (
            <button className="article-ecran__lien" onClick={() => setConfirmerSuppr(true)}>{t('supprimer_article')}</button>
          )
        )}
      </div>

      <div className="article-ecran__pied">
        <button className="btn--navy" disabled={!peutPublier || envoi} onClick={publier}>
          {estEdition ? t('enregistrer') : t('mettre_en_vente', { n: prix })}
        </button>
      </div>
    </div>
  )
}
