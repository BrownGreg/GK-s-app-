// Logique pure (pas de React, pas de réseau) partagée entre RequestsEcran et ses tests.

// Répartit les requêtes dans les 3 onglets de l'écran Demandes, selon le statut
// et qui en est à l'origine — c'est ici qu'un bug a déjà fait apparaître des
// cartes dans un onglet où elles n'avaient pas leur place (voir historique).
export function repartirRequetes(requetes, profilId) {
  const pourToi = requetes.filter((r) => r.statut === 'ouverte' && r.demande_par !== profilId)
  const envoyees = requetes.filter((r) => r.statut === 'ouverte' && r.demande_par === profilId)
  const faites = requetes.filter((r) => r.statut === 'ajoutee' || r.statut === 'validee')
  return { pourToi, envoyees, faites }
}

// Nombre de points qu'il manque pour acheter un article à `prix`, avec un
// solde de `solde` points. 0 si le solde est déjà suffisant.
export function calculerManque(prix, solde) {
  return Math.max(0, prix - (solde || 0))
}
