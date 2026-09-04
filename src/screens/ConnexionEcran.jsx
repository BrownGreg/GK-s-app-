import { useState } from 'react'
import { store, isRemote } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { Entete } from '../components/Commun'

export default function ConnexionEcran({ profil, onPret }) {
  const { t } = useLangue()
  const [prenom, setPrenom] = useState(profil?.prenom || '')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [etape, setEtape] = useState(profil ? 'couple' : isRemote ? 'email' : 'prenom')
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  const proteger = async (action) => {
    setErreur('')
    setOccupe(true)
    try { await action() } catch (e) { setErreur(t(e.message) || t('erreur_generique')) }
    finally { setOccupe(false) }
  }

  if (etape === 'prenom') {
    return (
      <Coquille>
        <p>{t('gate_local')}</p>
        <input
          value={prenom}
          placeholder={t('votre_prenom')}
          onChange={(e) => { setPrenom(e.target.value); setErreur('') }}
        />
        {erreur && <Erreur texte={erreur} />}
        <button
          className="btn"
          disabled={occupe}
          onClick={() => {
            if (!prenom.trim()) { setErreur(t('prenom_manquant')); return }
            proteger(async () => onPret(await store.connecter(prenom.trim())))
          }}
        >
          {t('commencer')}
        </button>
      </Coquille>
    )
  }

  if (etape === 'email') {
    return (
      <Coquille>
        <p>{t('gate_email')}</p>
        <input
          value={email}
          type="email"
          inputMode="email"
          placeholder={t('email_placeholder')}
          onChange={(e) => { setEmail(e.target.value); setErreur('') }}
        />
        {erreur && <Erreur texte={erreur} />}
        <button
          className="btn"
          disabled={occupe}
          onClick={() => {
            if (!email.includes('@')) { setErreur(t('email_invalide')); return }
            proteger(async () => {
              await store.envoyerLienConnexion(email.trim())
              setEtape('envoye')
            })
          }}
        >
          {occupe ? t('envoi') : t('recevoir_lien')}
        </button>
      </Coquille>
    )
  }

  if (etape === 'envoye') {
    return (
      <Coquille>
        <p>{t('lien_envoye', { email })}</p>
      </Coquille>
    )
  }

  // Appairage
  return (
    <Coquille>
      <p>{t('creer_espace')}</p>
      <input
        value={prenom}
        placeholder={t('votre_prenom')}
        onChange={(e) => { setPrenom(e.target.value); setErreur('') }}
      />
      <input
        value={code}
        placeholder={t('code_recu')}
        onChange={(e) => { setCode(e.target.value.toUpperCase()); setErreur('') }}
        style={{ letterSpacing: '0.2em' }}
      />
      {erreur && <Erreur texte={erreur} />}
      <button
        className="btn"
        disabled={occupe}
        onClick={() => {
          if (!prenom.trim()) { setErreur(t('prenom_manquant')); return }
          proteger(async () => {
            if (code.trim()) await store.rejoindreCouple(prenom.trim(), code)
            else await store.creerCouple(prenom.trim())
            onPret(await store.profil())
          })
        }}
      >
        {code.trim() ? t('rejoindre') : t('creer_notre_espace')}
      </button>
    </Coquille>
  )
}

function Coquille({ children }) {
  const { t } = useLangue()
  return (
    <div className="gate">
      <Entete phrase={t('a_deux_cest_mieux')} onEditPhrase={() => {}} />
      {children}
    </div>
  )
}

function Erreur({ texte }) {
  return <p style={{ color: '#e88a80', fontSize: 14, marginTop: 0 }}>{texte}</p>
}
