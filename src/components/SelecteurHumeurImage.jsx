import { useEffect, useState } from 'react'
import { compresserImage } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { Panneau } from './Panneaux'

const CLE_GIPHY = import.meta.env.VITE_GIPHY_API_KEY

// Choix d'une photo perso (compressée, comme pour les envies) ou d'un GIF
// cherché via l'API Giphy — les deux aboutissent au même résultat, une URL
// (ou data URL) passée à onChoisir.
export function SelecteurHumeurImage({ onChoisir, onAnnuler }) {
  const { t } = useLangue()
  const [onglet, setOnglet] = useState('photo')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const [recherche, setRecherche] = useState('')
  const [gifs, setGifs] = useState([])
  const [chargementGifs, setChargementGifs] = useState(false)

  useEffect(() => {
    if (onglet !== 'gif' || !CLE_GIPHY) return
    const identifiant = setTimeout(async () => {
      setChargementGifs(true)
      try {
        const url = recherche.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${CLE_GIPHY}&q=${encodeURIComponent(recherche.trim())}&limit=20&rating=pg-13`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${CLE_GIPHY}&limit=20&rating=pg-13`
        const reponse = await fetch(url)
        const json = await reponse.json()
        setGifs(json.data || [])
      } catch {
        setGifs([])
      } finally {
        setChargementGifs(false)
      }
    }, 350)
    return () => clearTimeout(identifiant)
  }, [onglet, recherche])

  const choisirPhoto = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur('')
    setEnvoi(true)
    try {
      const compressee = await compresserImage(fichier, 640, 0.8)
      onChoisir(compressee)
    } catch (err) {
      setErreur(t(err.message) || t('photo_erreur_profil'))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Panneau onFermer={onAnnuler}>
      <h2>{t('humeur_photo_titre')}</h2>

      <div className="choice" style={{ marginBottom: 16 }}>
        <button aria-pressed={onglet === 'photo'} onClick={() => setOnglet('photo')}>
          {t('humeur_onglet_photo')}
        </button>
        <button aria-pressed={onglet === 'gif'} onClick={() => setOnglet('gif')}>
          {t('humeur_onglet_gif')}
        </button>
      </div>

      {erreur && <p style={{ color: '#b3352c', fontSize: 13, textAlign: 'center' }}>{erreur}</p>}

      {onglet === 'photo' && (
        <label className="btn" style={{ textAlign: 'center', cursor: 'pointer' }}>
          {envoi ? '…' : t('humeur_ajouter_photo')}
          <input type="file" accept="image/*" onChange={choisirPhoto} disabled={envoi} style={{ display: 'none' }} />
        </label>
      )}

      {onglet === 'gif' && (
        !CLE_GIPHY ? (
          <p className="meta">{t('gif_non_configure')}</p>
        ) : (
          <>
            <div className="field">
              <input
                value={recherche}
                placeholder={t('gif_rechercher_placeholder')}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
            {chargementGifs ? (
              <p className="meta">{t('un_instant')}</p>
            ) : gifs.length === 0 ? (
              <p className="meta">{t('gif_aucun_resultat')}</p>
            ) : (
              <div className="gif-grille">
                {gifs.map((g) => (
                  <button key={g.id} onClick={() => onChoisir(g.images.fixed_width.url)}>
                    <img src={g.images.fixed_width_small.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </>
        )
      )}

      <button className="btn btn--ghost" onClick={onAnnuler}>{t('annuler')}</button>
    </Panneau>
  )
}
