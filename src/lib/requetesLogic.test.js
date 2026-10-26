import { describe, it, expect } from 'vitest'
import { repartirRequetes, calculerManque } from './requetesLogic'

describe('repartirRequetes', () => {
  const moi = 'greg'
  const partenaire = 'kim'

  it('met une requête ouverte reçue dans "pourToi", pas ailleurs', () => {
    const requetes = [{ id: 1, statut: 'ouverte', demande_par: partenaire }]
    const { pourToi, envoyees, faites } = repartirRequetes(requetes, moi)
    expect(pourToi.map((r) => r.id)).toEqual([1])
    expect(envoyees).toEqual([])
    expect(faites).toEqual([])
  })

  it('met une requête ouverte envoyée par moi dans "envoyees", pas dans "pourToi"', () => {
    const requetes = [{ id: 2, statut: 'ouverte', demande_par: moi }]
    const { pourToi, envoyees, faites } = repartirRequetes(requetes, moi)
    expect(pourToi).toEqual([])
    expect(envoyees.map((r) => r.id)).toEqual([2])
    expect(faites).toEqual([])
  })

  it('met une requête "ajoutee" dans "faites" quel que soit l\'auteur (ni pourToi, ni envoyees)', () => {
    const requetes = [
      { id: 3, statut: 'ajoutee', demande_par: partenaire },
      { id: 4, statut: 'ajoutee', demande_par: moi }
    ]
    const { pourToi, envoyees, faites } = repartirRequetes(requetes, moi)
    expect(pourToi).toEqual([])
    expect(envoyees).toEqual([])
    expect(faites.map((r) => r.id).sort()).toEqual([3, 4])
  })

  it('met une requête "validee" dans "faites"', () => {
    const requetes = [{ id: 5, statut: 'validee', demande_par: partenaire, valide_par: moi }]
    const { faites } = repartirRequetes(requetes, moi)
    expect(faites.map((r) => r.id)).toEqual([5])
  })

  it('répartit un mélange de statuts sans doublon ni perte', () => {
    const requetes = [
      { id: 1, statut: 'ouverte', demande_par: partenaire },
      { id: 2, statut: 'ouverte', demande_par: moi },
      { id: 3, statut: 'ajoutee', demande_par: partenaire },
      { id: 4, statut: 'validee', demande_par: moi }
    ]
    const { pourToi, envoyees, faites } = repartirRequetes(requetes, moi)
    expect(pourToi.map((r) => r.id)).toEqual([1])
    expect(envoyees.map((r) => r.id)).toEqual([2])
    expect(faites.map((r) => r.id).sort()).toEqual([3, 4])
  })
})

describe('calculerManque', () => {
  it('retourne 0 quand le solde couvre exactement le prix', () => {
    expect(calculerManque(5, 5)).toBe(0)
  })

  it('retourne 0 quand le solde dépasse le prix', () => {
    expect(calculerManque(5, 20)).toBe(0)
  })

  it('retourne le nombre de points manquants quand le solde est insuffisant', () => {
    expect(calculerManque(5, 4)).toBe(1)
    expect(calculerManque(10, 0)).toBe(10)
  })

  it('traite un solde nul/undefined comme 0', () => {
    expect(calculerManque(5, 0)).toBe(5)
    expect(calculerManque(5, undefined)).toBe(5)
  })
})
