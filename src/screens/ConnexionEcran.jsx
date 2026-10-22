import { useState } from 'react'
import { store, isRemote } from '../lib/store'
import { useLangue } from '../lib/i18n'
import { Entete } from '../components/Commun'

export default function ConnexionEcran({ profil, onPret }) {
  const { t } = useLangue()
  const [prenom, setPrenom] = useState(profil?.prenom || '')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [avecMotDePasse, setAvecMotDePasse] = useState(false)
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
        <p>{avecMotDePasse ? t('gate_mdp') : t('gate_email')}</p>

        <div className="langue-switch" style={{ marginBottom: 16 }}>
          <button aria-pressed={!avecMotDePasse} onClick={() => { setAvecMotDePasse(false); setErreur('') }}>
            {t('lien_magique')}
          </button>
          <span>/</span>
          <button aria-pressed={avecMotDePasse} onClick={() => { setAvecMotDePasse(true); setErreur('') }}>
            {t('mot_de_passe')}
          </button>
        </div>

        <input
          value={email}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('email_placeholder')}
          onChange={(e) => { setEmail(e.target.value); setErreur('') }}
        />

        {avecMotDePasse && (
          <input
            value={motDePasse}
            type="password"
            autoComplete="current-password"
            placeholder={t('mot_de_passe_placeholder')}
            onChange={(e) => { setMotDePasse(e.target.value); setErreur('') }}
          />
        )}

        {erreur && <Erreur texte={erreur} />}

        {avecMotDePasse ? (
          <>
            <button
              className="btn"
              disabled={occupe}
              onClick={() => {
                if (!email.includes('@')) { setErreur(t('email_invalide')); return }
                if (!motDePasse) { setErreur(t('mot_de_passe_manquant')); return }
                proteger(async () => {
                  await store.connecterMotDePasse(email.trim(), motDePasse)
                  onPret(await store.profil())
                })
              }}
            >
              {t('se_connecter')}
            </button>
            <button
              className="btn btn--ghost"
              disabled={occupe}
              onClick={() => {
                if (!email.includes('@')) { setErreur(t('email_invalide')); return }
                if (motDePasse.length < 6) { setErreur(t('mot_de_passe_court')); return }
                proteger(async () => {
                  await store.inscrireMotDePasse(email.trim(), motDePasse)
                  setEtape('inscrit')
                })
              }}
            >
              {t('creer_compte')}
            </button>
          </>
        ) : (
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
        )}

        <button
          className="btn btn--ghost"
          disabled={occupe}
          onClick={() => proteger(() => store.connecterGoogle())}
        >
          {t('continuer_google')}
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

  if (etape === 'inscrit') {
    return (
      <Coquille>
        <p>{t('inscription_envoyee', { email })}</p>
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
  return (
    <div className="gate">
      <Entete />
      {children}
    </div>
  )
}

function Erreur({ texte }) {
  return <p style={{ color: '#e88a80', fontSize: 14, marginTop: 0 }}>{texte}</p>
}
