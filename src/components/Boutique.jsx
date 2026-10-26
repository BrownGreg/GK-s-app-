import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { compresserImage } from '../lib/store'
import { BottomSheet as Panneau } from './BottomSheet'
import { Switch } from './ui'
import { calculerManque } from '../lib/requetesLogic'

// Photo, couleur unie + initiale, ou vignette neutre + initiale — selon
// visuel_type sur l'article. Même logique pour l'aperçu dans Nouvel article.
export function ItemThumb({ article, variante }) {
  const initiale = (article.titre || article.name || '?').charAt(0).toUpperCase()
  if (article.visuel_type === 'photo' && (article.image_url || article.imageApercu)) {
    return (
      <img
        className={`item-thumb item-thumb--${variante}`}
        src={article.image_url || article.imageApercu}
        alt=""
      />
    )
  }
  const couleur = article.visuel_type === 'couleur' ? article.visuel_couleur : 'var(--navy-500)'
  return (
    <div className={`item-thumb item-thumb--${variante} item-thumb--initiale`} style={{ background: couleur }}>
      {initiale}
    </div>
  )
}

// Carte article de boutique, dans ses 3 présentations : carrousel (148px,
// Demandes), grille 2 colonnes (Boutique → Chez {partenaire}), ligne de
// liste (Boutique → Ma boutique). Le contenu des actions (acheter, ou
// switch + édition) est fourni par l'appelant via `footer`.
export function ShopItemCard({ article, variante = 'grille', onClick, footer }) {
  const { t } = useLangue()

  if (variante === 'liste') {
    return (
      <div className="shop-ligne">
        <ItemThumb article={article} variante="liste" />
        <div className="shop-ligne__texte">
          <p className="shop-ligne__titre">{article.titre}</p>
          <p className="shop-ligne__meta">{article.prix} pts · {article.actif ? t('en_vente') : t('masque')}</p>
        </div>
        {footer}
      </div>
    )
  }

  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`shop-carte shop-carte--${variante}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <ItemThumb article={article} variante={variante} />
      <div className="shop-carte__corps">
        <span className="shop-carte__titre">{article.titre}</span>
        {variante === 'grille' && article.description && (
          <span className="shop-carte__desc">{article.description}</span>
        )}
        <span className="shop-carte__prix">
          <span className="shop-carte__piece" />
          {article.prix} pts
        </span>
        {footer}
      </div>
    </Tag>
  )
}

// Bottom sheet de confirmation d'achat, partagé entre Demandes et Boutique.
export function SheetAchat({ article, solde, prenomPartenaire, onAcheter, onFermer }) {
  const { t, tn } = useLangue()
  const apres = solde - article.prix
  const insuffisant = apres < 0

  return (
    <Panneau onFermer={onFermer} labelAria={t('confirmer_achat')}>
      <span className="sheet-achat__source">{t('boutique_de', { prenom: prenomPartenaire })}</span>
      <h2>{article.titre}</h2>
      {article.description && <p className="sheet-achat__desc">{article.description}</p>}

      <div className="sheet-achat__recap">
        <div><span>{t('ton_solde')}</span><span>{solde} pts</span></div>
        <div><span>{t('prix')}</span><span>− {article.prix} pts</span></div>
        <div className="sheet-achat__total">
          <span>{t('apres_achat')}</span>
          <span className={insuffisant ? 'danger' : ''}>{insuffisant ? t('insuffisant') : `${apres} pts`}</span>
        </div>
      </div>

      <button className="btn--navy" disabled={insuffisant} onClick={() => onAcheter(article)}>
        {insuffisant ? tn('il_te_manque', calculerManque(article.prix, solde)) : t('acheter_pour', { n: article.prix })}
      </button>
      {insuffisant && <p className="sheet-achat__aide">{t('termine_demandes', { prenom: prenomPartenaire })}</p>}
    </Panneau>
  )
}

const COULEURS_VIGNETTE = [
  { nom: 'Rose', valeur: 'var(--vignette-1)' },
  { nom: 'Pétrole', valeur: 'var(--vignette-2)' },
  { nom: 'Olive', valeur: 'var(--vignette-3)' },
  { nom: 'Cuivre', valeur: 'var(--vignette-4)' },
  { nom: 'Indigo', valeur: 'var(--vignette-5)' },
  { nom: 'Nuit', valeur: 'var(--vignette-6)' }
]
export { COULEURS_VIGNETTE }

// Choix de la photo d'un article (compressée, même pipeline que les photos
// d'envies) — utilisé par Nouvel article.
export function ChoixPhotoArticle({ onChoisir }) {
  const { t } = useLangue()
  const [erreur, setErreur] = useState('')

  const choisir = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    try { onChoisir(await compresserImage(fichier, 640, 0.8)) }
    catch { setErreur(t('photo_erreur_profil')) }
  }

  return (
    <div className="choix-photo-article">
      <label className="choix-photo-article__bouton">
        {t('appareil')}
        <input type="file" accept="image/*" capture="environment" onChange={choisir} />
      </label>
      <label className="choix-photo-article__bouton">
        {t('galerie')}
        <input type="file" accept="image/*" onChange={choisir} />
      </label>
      {erreur && <p className="erreur-texte">{erreur}</p>}
    </div>
  )
}
