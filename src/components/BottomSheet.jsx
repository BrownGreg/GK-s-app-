import { useEffect, useRef, useState } from 'react'

const SEUIL_FERMETURE = 90

// Bottom sheet partagé par tous les panneaux : voile, poignée, fermeture au
// tap sur le voile, à Échap, et au glissé vers le bas (sur la poignée).
export function BottomSheet({ onFermer, children, labelAria }) {
  const ref = useRef(null)
  const [decalage, setDecalage] = useState(0)
  const glisser = useRef(null)

  useEffect(() => {
    const echap = (e) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', echap)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', echap)
  }, [onFermer])

  const demarrerGlisser = (e) => {
    glisser.current = { y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const bougerGlisser = (e) => {
    if (!glisser.current) return
    setDecalage(Math.max(0, e.clientY - glisser.current.y))
  }
  const finirGlisser = () => {
    if (!glisser.current) return
    if (decalage > SEUIL_FERMETURE) onFermer()
    else setDecalage(0)
    glisser.current = null
  }

  return (
    <div className="sheet-backdrop" onClick={onFermer}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={labelAria}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: decalage ? `translateY(${decalage}px)` : undefined,
          transition: glisser.current ? 'none' : 'transform 180ms ease'
        }}
      >
        <div
          className="sheet__grab"
          onPointerDown={demarrerGlisser}
          onPointerMove={bougerGlisser}
          onPointerUp={finirGlisser}
          onPointerCancel={finirGlisser}
        />
        {children}
      </div>
    </div>
  )
}
