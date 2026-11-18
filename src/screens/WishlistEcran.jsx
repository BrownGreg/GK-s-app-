import { useState } from 'react'
import { useLangue } from '../lib/i18n'
import { Vide, BoutonProfil } from '../components/Commun'
import { CarteSouhait } from '../components/Souhaits'

// Trois vues : mes souhaits, ceux du/de la partenaire (à qui on peut
// faire un cadeau), et ce qui a déjà été reçu, de part et d'autre.
export default function WishlistEcran({ souhaits, profil, partenaire, onOuvrir, avatarUrl, pastilleProfil, onOuvrirProfil }) {
  const { t, tn } = useLangue()
  const [vue, setVue] = useState('moi')

  const VUES = [
    { cle: 'moi', libelle: t('wishlist_vue_moi') },
    ...(partenaire ? [{ cle: 'partenaire', libelle: t('wishlist_vue_partenaire', { prenom: partenaire.prenom }) }] : []),
    { cle: 'recus', libelle: t('wishlist_vue_recus') }
  ]
  const vueActive = VUES.some((v) => v.cle === vue) ? vue : 'moi'

  const enCours = souhaits.filter((s) => !s.recu)
  const visibles =
    vueActive === 'recus' ? souhaits.filter((s) => s.recu)
      : vueActive === 'partenaire' ? enCours.filter((s) => s.cree_par !== profil.id)
        : enCours.filter((s) => s.cree_par === profil.id)

  const vide =
    vueActive === 'recus' ? { titre: t('wishlist_recus_vide_titre'), texte: t('wishlist_recus_vide_texte') }
      : vueActive === 'partenaire' ? { titre: t('wishlist_partenaire_vide_titre'), texte: t('wishlist_partenaire_vide_texte', { prenom: partenaire?.prenom || '' }) }
        : { titre: t('wishlist_vide_titre'), texte: t('wishlist_vide_texte') }

  const reservesParMoi = enCours.filter((s) => s.cree_par !== profil.id && s.reserve_par === profil.id).length

  return (
    <div className="screen">
      <div style={{ position: 'relative' }}>
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} pastille={pastilleProfil} onClick={onOuvrirProfil} />}
        <h1 className="header__title" style={{ fontSize: 44, textAlign: 'center', marginBottom: 20 }}>
          {t('wishlist_titre')}
        </h1>
      </div>

      <div className="segmented" role="group" aria-label={t('filtrer_aria')}>
        {VUES.map((v) => (
          <button key={v.cle} aria-pressed={vueActive === v.cle} onClick={() => setVue(v.cle)}>
            {v.libelle}
          </button>
        ))}
      </div>

      {vueActive === 'partenaire' && reservesParMoi > 0 && (
        <p className="souhaits-resume">🎁 {tn('wishlist_reserves_par_moi', reservesParMoi)}</p>
      )}

      {visibles.length === 0 ? (
        <Vide titre={vide.titre} texte={vide.texte} />
      ) : (
        <div className="souhaits-grille">
          {visibles.map((s) => (
            <CarteSouhait key={s.id} souhait={s} profilId={profil.id} onOuvrir={onOuvrir} />
          ))}
        </div>
      )}
    </div>
  )
}
