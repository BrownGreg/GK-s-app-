import { useMemo, useState } from 'react'
import { useLangue } from '../lib/i18n'
import { TYPES_SORTIE, TYPES_SOUHAIT, moyenneNote } from '../lib/store'
import { Entete, CarteEnvie, Vide } from '../components/Commun'
import { BarreFiltres } from '../components/BarreFiltres'

const TOUS_TYPES = [...TYPES_SORTIE, ...TYPES_SOUHAIT]

function comparer(a, b, tri, direction) {
  const signe = direction === 'asc' ? 1 : -1
  if (tri === 'type') {
    return signe * (TOUS_TYPES.indexOf(a.type) - TOUS_TYPES.indexOf(b.type))
  }
  if (tri === 'note') {
    return signe * (moyenneNote(a) - moyenneNote(b))
  }
  // Date : les envies sans date_prevue restent toujours en bas, peu importe le sens.
  const da = a.date_prevue ? new Date(a.date_prevue).getTime() : null
  const db = b.date_prevue ? new Date(b.date_prevue).getTime() : null
  if (da === null && db === null) return signe * (new Date(a.cree_le) - new Date(b.cree_le))
  if (da === null) return 1
  if (db === null) return -1
  return signe * (da - db)
}

export default function ListeEcran({ items, phrase, onEditPhrase, avatarUrl, onOuvrirProfil, onOuvrir, onBasculer }) {
  const { t, tn } = useLangue()
  const [filtre, setFiltre] = useState('tous')
  const [tri, setTri] = useState('date')
  const [direction, setDirection] = useState('desc')
  const [tagsSelectionnes, setTagsSelectionnes] = useState([])

  const FILTRES = [
    { cle: 'tous', libelle: t('filtre_tous') },
    { cle: 'afaire', libelle: t('filtre_afaire') },
    { cle: 'faits', libelle: t('filtre_faits') }
  ]
  const TRIS = [
    { cle: 'date', libelle: t('trier_date') },
    { cle: 'type', libelle: t('trier_type') },
    { cle: 'note', libelle: t('trier_note') }
  ]

  const parStatut = items.filter((i) => (filtre === 'tous' ? true : filtre === 'afaire' ? !i.fait : i.fait))

  const tagsDisponibles = useMemo(
    () => [...new Set(parStatut.flatMap((i) => i.tags || []))].sort((a, b) => a.localeCompare(b)),
    [parStatut]
  )

  const basculerTag = (tag) =>
    setTagsSelectionnes((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]))

  const visibles = parStatut
    .filter((i) => tagsSelectionnes.length === 0 || tagsSelectionnes.some((tag) => i.tags?.includes(tag)))
    .sort((a, b) => comparer(a, b, tri, direction))

  return (
    <div className="screen">
      <Entete phrase={phrase} onEditPhrase={onEditPhrase} avatarUrl={avatarUrl} onOuvrirProfil={onOuvrirProfil} />

      <BarreFiltres
        resume={tn('envie', visibles.length)}
        statutOptions={FILTRES}
        statut={filtre}
        onStatut={setFiltre}
        triOptions={TRIS}
        tri={tri}
        onTri={setTri}
        direction={direction}
        onDirection={() => setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
        tagsDisponibles={tagsDisponibles}
        tagsSelectionnes={tagsSelectionnes}
        onBasculerTag={basculerTag}
        onEffacerTags={() => setTagsSelectionnes([])}
      />

      {visibles.length === 0 ? (
        tagsSelectionnes.length > 0 && parStatut.length > 0 ? (
          <Vide titre={t('filtre_vide_titre')} texte={t('filtre_vide_texte')} />
        ) : (
          <Vide
            titre={filtre === 'faits' ? t('vide_faits_titre') : t('vide_liste_titre')}
            texte={filtre === 'faits' ? t('vide_faits_texte') : t('vide_liste_texte')}
          />
        )
      ) : (
        visibles.map((item) => (
          <CarteEnvie key={item.id} item={item} onOuvrir={onOuvrir} onBasculer={onBasculer} />
        ))
      )}
    </div>
  )
}
