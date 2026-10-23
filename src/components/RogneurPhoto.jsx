import { useEffect, useRef, useState } from 'react'
import { versJPEGSiHEIC } from '../lib/store'
import { useLangue } from '../lib/i18n'

const TAILLE_VUE = 260
const TAILLE_SORTIE = 500
const ZOOM_MAX = 3

function limiter(decalage, echelle, image) {
  if (!image) return decalage
  const largeur = image.width * echelle
  const hauteur = image.height * echelle
  const minX = Math.min(0, TAILLE_VUE - largeur)
  const minY = Math.min(0, TAILLE_VUE - hauteur)
  return {
    x: Math.min(0, Math.max(minX, decalage.x)),
    y: Math.min(0, Math.max(minY, decalage.y))
  }
}

// Rognage de l'avatar avant envoi : l'utilisateur choisit lui-même le cadrage
// (déplacer/zoomer) plutôt que de subir un recadrage centré automatique.
export function RogneurPhoto({ fichier, onValider, onAnnuler }) {
  const { t } = useLangue()
  const [image, setImage] = useState(null)
  const [erreur, setErreur] = useState('')
  const [zoom, setZoom] = useState(1)
  const [decalage, setDecalage] = useState({ x: 0, y: 0 })
  const glisser = useRef(null)

  useEffect(() => {
    let url
    ;(async () => {
      try {
        const normalise = await versJPEGSiHEIC(fichier)
        url = URL.createObjectURL(normalise)
        const img = new Image()
        img.onload = () => {
          const echelleBase = TAILLE_VUE / Math.min(img.width, img.height)
          setImage(img)
          setZoom(1)
          setDecalage({
            x: (TAILLE_VUE - img.width * echelleBase) / 2,
            y: (TAILLE_VUE - img.height * echelleBase) / 2
          })
        }
        img.onerror = () => setErreur(t('photo_erreur_profil'))
        img.src = url
      } catch {
        setErreur(t('heic_illisible'))
      }
    })()
    return () => url && URL.revokeObjectURL(url)
  }, [fichier])

  const echelleBase = image ? TAILLE_VUE / Math.min(image.width, image.height) : 1
  const echelle = echelleBase * zoom

  const changerZoom = (nouveauZoom) => {
    setZoom(nouveauZoom)
    setDecalage((d) => limiter(d, echelleBase * nouveauZoom, image))
  }

  const demarrerGlisser = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    glisser.current = { x: e.clientX, y: e.clientY, depart: decalage }
  }
  const bougerGlisser = (e) => {
    if (!glisser.current) return
    const dx = e.clientX - glisser.current.x
    const dy = e.clientY - glisser.current.y
    setDecalage(
      limiter({ x: glisser.current.depart.x + dx, y: glisser.current.depart.y + dy }, echelle, image)
    )
  }
  const arreterGlisser = () => { glisser.current = null }

  const valider = () => {
    const canvas = document.createElement('canvas')
    canvas.width = TAILLE_SORTIE
    canvas.height = TAILLE_SORTIE
    const sx = -decalage.x / echelle
    const sy = -decalage.y / echelle
    const cote = TAILLE_VUE / echelle
    canvas.getContext('2d').drawImage(image, sx, sy, cote, cote, 0, 0, TAILLE_SORTIE, TAILLE_SORTIE)
    onValider(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div className="sheet-backdrop rogneur-backdrop" onClick={onAnnuler}>
      <div className="sheet rogneur" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grab" />
        <h2>{t('photo_rogner_titre')}</h2>

        {erreur && <p style={{ color: '#b3352c', fontSize: 13, textAlign: 'center' }}>{erreur}</p>}

        {image && (
          <>
            <div
              className="rogneur__vue"
              onPointerDown={demarrerGlisser}
              onPointerMove={bougerGlisser}
              onPointerUp={arreterGlisser}
              onPointerCancel={arreterGlisser}
            >
              <img
                src={image.src}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: decalage.x,
                  top: decalage.y,
                  width: image.width * echelle,
                  height: image.height * echelle,
                  maxWidth: 'none'
                }}
              />
            </div>

            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={(e) => changerZoom(Number(e.target.value))}
              className="rogneur__zoom"
              aria-label={t('photo_rogner_zoom')}
            />

            <button className="btn" onClick={valider}>{t('valider')}</button>
            <button className="btn btn--ghost" onClick={onAnnuler}>{t('annuler')}</button>
          </>
        )}
      </div>
    </div>
  )
}
