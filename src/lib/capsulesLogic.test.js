import { describe, it, expect } from 'vitest'
import { repartirCapsules, compterAOuvrir, delaiProchaineOuverture, tempsRestant } from './capsulesLogic'

const maintenant = new Date('2026-11-02T12:00:00Z').getTime()
const jour = 24 * 3600e3
const dans = (ms) => new Date(maintenant + ms).toISOString()

describe('repartirCapsules', () => {
  const capsules = [
    { id: 'recue-ouverte', auteur: 'kim', destinataire: 'greg', ouvre_le: dans(-jour) },
    { id: 'recue-scellee', auteur: 'kim', destinataire: 'greg', ouvre_le: dans(10 * jour) },
    { id: 'recue-bientot', auteur: 'kim', destinataire: 'greg', ouvre_le: dans(2 * jour) },
    { id: 'envoyee', auteur: 'greg', destinataire: 'kim', ouvre_le: dans(5 * jour) }
  ]

  it('sépare reçues ouvertes, reçues scellées et envoyées', () => {
    const { recues, enAttente, envoyees } = repartirCapsules(capsules, 'greg', maintenant)
    expect(recues.map((c) => c.id)).toEqual(['recue-ouverte'])
    expect(enAttente.map((c) => c.id)).toEqual(['recue-bientot', 'recue-scellee'])
    expect(envoyees.map((c) => c.id)).toEqual(['envoyee'])
  })

  it('mode local : une capsule à soi-même ne va que dans les reçues', () => {
    const solo = [{ id: 'moi', auteur: 'greg', destinataire: 'greg', ouvre_le: dans(-jour) }]
    const { recues, envoyees } = repartirCapsules(solo, 'greg', maintenant)
    expect(recues.map((c) => c.id)).toEqual(['moi'])
    expect(envoyees).toEqual([])
  })
})

describe('compterAOuvrir', () => {
  it('ne compte que les capsules reçues, ouvrables et pas encore lues', () => {
    const capsules = [
      { destinataire: 'greg', ouvre_le: dans(-jour), lue_le: null },
      { destinataire: 'greg', ouvre_le: dans(-jour), lue_le: dans(-1000) },
      { destinataire: 'greg', ouvre_le: dans(jour), lue_le: null },
      { destinataire: 'kim', ouvre_le: dans(-jour), lue_le: null }
    ]
    expect(compterAOuvrir(capsules, 'greg', maintenant)).toBe(1)
  })
})

describe('delaiProchaineOuverture', () => {
  it('renvoie le délai jusqu’à la plus proche capsule future', () => {
    const capsules = [{ ouvre_le: dans(-jour) }, { ouvre_le: dans(3 * jour) }, { ouvre_le: dans(jour) }]
    expect(delaiProchaineOuverture(capsules, maintenant)).toBe(jour)
  })

  it('renvoie null quand tout est déjà ouvert', () => {
    expect(delaiProchaineOuverture([{ ouvre_le: dans(-jour) }], maintenant)).toBeNull()
  })
})

describe('tempsRestant', () => {
  it('choisit la plus grande unité pertinente', () => {
    expect(tempsRestant(dans(3 * jour + 3600e3), 'fr', maintenant)).toBe('dans 3 jours')
    expect(tempsRestant(dans(400 * jour), 'en', maintenant)).toBe('next year')
    expect(tempsRestant(dans(5 * 3600e3), 'en', maintenant)).toBe('in 5 hours')
  })

  it('ne descend pas sous une minute', () => {
    expect(tempsRestant(dans(10e3), 'fr', maintenant)).toBe('dans 1 minute')
  })
})

describe('tempsRestant (arrondi)', () => {
  it('une capsule à 30 jours moins quelques secondes affiche « dans 30 jours »', () => {
    expect(tempsRestant(dans(30 * jour - 5000), 'fr', maintenant)).toBe('dans 30 jours')
  })
})
