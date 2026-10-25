import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { compresserImage } from '../lib/store'
import { Panneau } from './Panneaux'

const VALEURS_PRIX = [2, 3, 5, 8, 10, 15]

// Vitrine des articles du/de la partenaire, parcourable en carrousel —
// affichée à la place de l'ancien résumé de points dans Requests.
export function CarrouselBoutique({ articles, points, onAcheter, prenom }) {
  const { t } = useLangue()

  if (articles.length === 0) {
    return (
      <div className="boutique-carrousel boutique-carrousel--vide">
        <p className="meta" style={{ margin: 0 }}>{t('boutique_carousel_vide', { prenom })}</p>
      </div>
    )
  }

  return (
    <div className="boutique-carrousel">
      {articles.map((a) => {
        const abordable = points >= a.prix
        return (
          <div className="boutique-carte" key={a.id}>
            {a.image_url ? (
              <img className="boutique-carte__image" src={a.image_url} alt="" />
            ) : (
              <div className="boutique-carte__image boutique-carte__image--vide" />
            )}
            <div className="boutique-carte__corps">
              <p className="boutique-carte__titre">{a.titre}</p>
              {a.description && <p className="boutique-carte__desc">{a.description}</p>}
              <button
                className={`boutique-carte__acheter${abordable ? '' : ' hors-de-prix'}`}
                disabled={!abordable}
                onClick={() => onAcheter(a)}
              >
                {abordable ? `${t('acheter')} · ${a.prix}` : t('points_insuffisants')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FormulaireArticle({ onValider, onAnnuler }) {
  const { t } = useLangue()
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState(5)
  const [image, setImage] = useState(null)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const choisirPhoto = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    try { setImage(await compresserImage(fichier, 640, 0.8)) }
    catch { /* pas critique : l'article reste utilisable sans photo */ }
  }

  const valider = async () => {
    if (!titre.trim()) { setErreur(t('article_titre_manquant')); return }
    setEnvoi(true)
    try {
      await onValider({ titre: titre.trim(), description: description.trim(), prix, image })
    } catch (err) {
      setErreur(t(err.message) || t('erreur_generique'))
      setEnvoi(false)
    }
  }

  return (
    <>
      <div className="field">
        <label>{t('titre_champ')}</label>
        <input
          autoFocus
          value={titre}
          placeholder={t('article_titre_placeholder')}
          onChange={(e) => { setTitre(e.target.value); setErreur('') }}
        />
      </div>

      <div className="field">
        <label>{t('deux_mots')}</label>
        <input
          value={description}
          placeholder={t('article_description_placeholder')}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label>{t('article_prix_label')}</label>
        <div className="choice">
          {VALEURS_PRIX.map((n) => (
            <button key={n} aria-pressed={prix === n} onClick={() => setPrix(n)}>{n}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>{t('article_photo_label')}</label>
        {image ? (
          <img src={image} alt="" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 12 }} />
        ) : (
          <label className="btn btn--ghost" style={{ display: 'inline-block', cursor: 'pointer', margin: 0 }}>
            {t('article_photo_label')}
            <input type="file" accept="image/*" onChange={choisirPhoto} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      {erreur && <p style={{ color: '#b3352c', fontSize: 13 }}>{erreur}</p>}

      <button className="btn" onClick={valider} disabled={envoi}>{t('valider')}</button>
      <button className="btn btn--ghost" onClick={onAnnuler}>{t('annuler')}</button>
    </>
  )
}

// Gestion de sa propre boutique : liste + suppression + formulaire d'ajout.
export function PanneauMaBoutique({ articles, onCreer, onSupprimer, onFermer, prenomPartenaire }) {
  const { t } = useLangue()
  const [ajoutOuvert, setAjoutOuvert] = useState(false)

  return (
    <Panneau onFermer={onFermer}>
      <h2>{t('boutique_titre')}</h2>

      {ajoutOuvert ? (
        <FormulaireArticle
          onValider={async (article) => { await onCreer(article); setAjoutOuvert(false) }}
          onAnnuler={() => setAjoutOuvert(false)}
        />
      ) : (
        <>
          {articles.length === 0 ? (
            <div className="field">
              <p className="meta">{t('boutique_vide_texte', { prenom: prenomPartenaire })}</p>
            </div>
          ) : (
            articles.map((a) => (
              <div className="mon-article" key={a.id}>
                {a.image_url ? (
                  <img className="mon-article__image" src={a.image_url} alt="" />
                ) : (
                  <div className="mon-article__image mon-article__image--vide" />
                )}
                <div className="mon-article__corps">
                  <p className="mon-article__titre">{a.titre}</p>
                  <p className="mon-article__prix">{a.prix} pts</p>
                </div>
                <button
                  className="mon-article__suppr"
                  onClick={() => onSupprimer(a.id)}
                  aria-label={t('supprimer_article')}
                >
                  ×
                </button>
              </div>
            ))
          )}

          <button className="btn" onClick={() => setAjoutOuvert(true)}>{t('boutique_ajouter')}</button>
          <button className="btn btn--ghost" onClick={onFermer}>{t('fermer')}</button>
        </>
      )}
    </Panneau>
  )
}
