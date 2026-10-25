import { useEffect, useRef, useState } from 'react'
import { store, isRemote } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { Vide, BoutonProfil } from '../components/Commun'

export default function AssistantEcran({ avatarUrl, onOuvrirProfil }) {
  const { t, langue } = useLangue()
  const [messages, setMessages] = useState([]) // { role: 'user' | 'assistant', content }
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const finRef = useRef(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, envoi])

  const envoyer = async () => {
    const contenu = texte.trim()
    if (!contenu || envoi) return
    setTexte('')
    setErreur('')
    const historique = [...messages, { role: 'user', content: contenu }]
    setMessages(historique)
    setEnvoi(true)
    try {
      const reponse = await store.demanderAssistant(historique, langue)
      setMessages((m) => [...m, { role: 'assistant', content: reponse }])
    } catch {
      setErreur(t('assistant_erreur'))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="screen">
      <div style={{ position: 'relative' }}>
        {onOuvrirProfil && <BoutonProfil avatarUrl={avatarUrl} onClick={onOuvrirProfil} />}
        <h1 className="header__title" style={{ fontSize: 40, textAlign: 'center', marginBottom: 20 }}>
          {t('assistant_titre')}
        </h1>
      </div>

      {!isRemote ? (
        <Vide titre={t('assistant_vide_titre')} texte={t('assistant_indisponible')} />
      ) : (
        <>
          {messages.length === 0 && (
            <Vide titre={t('assistant_vide_titre')} texte={t('assistant_vide_texte')} />
          )}

          <div className="chat-liste">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bulle chat-bulle--${m.role}`}>
                <p>{m.content}</p>
              </div>
            ))}
            {envoi && (
              <div className="chat-bulle chat-bulle--assistant chat-bulle--attente">
                <p>{t('assistant_reflexion')}</p>
              </div>
            )}
            {erreur && <p style={{ color: '#e2938a', fontSize: 13, textAlign: 'center' }}>{erreur}</p>}
            <div ref={finRef} />
          </div>

          <div className="chat-saisie">
            <input
              value={texte}
              placeholder={t('assistant_placeholder')}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') envoyer() }}
            />
            <button onClick={envoyer} disabled={envoi || !texte.trim()} aria-label={t('assistant_envoyer_aria')}>
              →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
