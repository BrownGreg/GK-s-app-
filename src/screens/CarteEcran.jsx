import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { chercherLieu } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { IconeLoupe } from '../components/Commun'

// Carto exige désormais une clé API, même gratuite (voir docs.carto.com/faqs/carto-basemaps).
// OpenFreeMap n'a pas de style sombre tout fait : on part du style clair "positron"
// et on l'inverse en CSS pour retrouver l'ambiance bleu nuit, sans clé ni compte.
const STYLE = 'https://tiles.openfreemap.org/styles/positron'

export default function CarteEcran({ items, onOuvrir, onAjouterIci }) {
  const { t } = useLangue()
  const conteneur = useRef(null)
  const carte = useRef(null)
  const marqueurs = useRef([])
  const [requete, setRequete] = useState('')
  const [resultats, setResultats] = useState([])
  const [prete, setPrete] = useState(false)

  useEffect(() => {
    if (carte.current) return
    carte.current = new maplibregl.Map({
      container: conteneur.current,
      style: STYLE,
      center: [2.3522, 48.8566],
      zoom: 4.2,
      attributionControl: { compact: true }
    })
    carte.current.on('load', () => {
      // "positron" est un style clair : on l'inverse pour retrouver un fond sombre
      // bleu nuit, cohérent avec l'identité de l'app.
      const canvas = carte.current.getCanvasContainer()
      canvas.style.filter = 'invert(1) hue-rotate(185deg) saturate(0.85) brightness(0.95) contrast(0.9)'
      setPrete(true)
    })
    return () => { carte.current?.remove(); carte.current = null }
  }, [])

  // Pins : uniquement les envies qui ont des coordonnées.
  useEffect(() => {
    if (!prete) return
    marqueurs.current.forEach((m) => m.remove())
    marqueurs.current = items
      .filter((i) => i.lat != null && i.lng != null)
      .map((item) => {
        const el = document.createElement('div')
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', item.titre)
        el.addEventListener('click', (e) => { e.stopPropagation(); onOuvrir(item) })

        if (item.fait) {
          el.className = 'pin pin--done'
          el.textContent = '✓'
          return new maplibregl.Marker({ element: el })
            .setLngLat([item.lng, item.lat])
            .addTo(carte.current)
        }

        // Goutte façon pin classique : le sommet (pas le centre) doit désigner
        // le lieu, d'où le wrapper non transformé (ancre) + forme tournée à l'intérieur.
        el.className = 'pin-goutte'
        el.innerHTML = '<span></span>'
        return new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([item.lng, item.lat])
          .addTo(carte.current)
      })
  }, [items, prete, onOuvrir])

  useEffect(() => {
    if (requete.trim().length < 3) { setResultats([]); return }
    const delai = setTimeout(async () => {
      const centre = carte.current?.getCenter()
      try { setResultats(await chercherLieu(requete, centre && [centre.lng, centre.lat])) }
      catch { setResultats([]) }
    }, 350)
    return () => clearTimeout(delai)
  }, [requete])

  const allerVers = (lieu) => {
    setRequete('')
    setResultats([])
    carte.current?.flyTo({ center: [lieu.lng, lieu.lat], zoom: 14 })
    onAjouterIci(lieu)
  }

  return (
    <div className="screen screen--flush">
      <div className="carte" ref={conteneur} />

      <div className="map-search">
        <div style={{ position: 'relative' }}>
          <IconeLoupe />
          <input
            value={requete}
            placeholder={t('chercher_lieu')}
            onChange={(e) => setRequete(e.target.value)}
            aria-label={t('chercher_lieu')}
          />
        </div>
        {resultats.length > 0 && (
          <div className="map-results">
            {resultats.map((r, i) => (
              <button key={i} onClick={() => allerVers(r)}>
                {r.nom}
                <small>{r.detail}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => onAjouterIci(null)} aria-label={t('ajouter_envie_aria')}>
        +
      </button>
    </div>
  )
}
