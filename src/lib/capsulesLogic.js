// Logique pure (pas de React, pas de réseau) des capsules temporelles,
// partagée entre l'écran Capsules, App (badge, minuterie) et les tests.

const estOuverte = (c, maintenant) => new Date(c.ouvre_le).getTime() <= maintenant

// Répartit les capsules entre ce que j'ai reçu et ce que j'ai envoyé.
// « recues » : déjà ouvertes, les plus récentes d'abord. « enAttente » :
// encore scellées, la prochaine à s'ouvrir d'abord. En mode local (solo),
// on s'écrit à soi-même : ces capsules ne vont que dans « recues ».
export function repartirCapsules(capsules, profilId, maintenant = Date.now()) {
  const pourMoi = capsules.filter((c) => c.destinataire === profilId)
  const recues = pourMoi
    .filter((c) => estOuverte(c, maintenant))
    .sort((a, b) => new Date(b.ouvre_le) - new Date(a.ouvre_le))
  const enAttente = pourMoi
    .filter((c) => !estOuverte(c, maintenant))
    .sort((a, b) => new Date(a.ouvre_le) - new Date(b.ouvre_le))
  const envoyees = capsules
    .filter((c) => c.auteur === profilId && c.destinataire !== profilId)
    .sort((a, b) => new Date(a.ouvre_le) - new Date(b.ouvre_le))
  return { recues, enAttente, envoyees }
}

// Capsules reçues, ouvrables, pas encore lues : ce qui mérite un badge.
export function compterAOuvrir(capsules, profilId, maintenant = Date.now()) {
  return capsules.filter((c) => c.destinataire === profilId && !c.lue_le && estOuverte(c, maintenant)).length
}

// Délai (ms) avant la prochaine ouverture, pour rafraîchir pile à ce moment-là
// si l'app est ouverte. null s'il n'y a rien à attendre.
export function delaiProchaineOuverture(capsules, maintenant = Date.now()) {
  const futures = capsules
    .map((c) => new Date(c.ouvre_le).getTime() - maintenant)
    .filter((d) => d > 0)
  return futures.length ? Math.min(...futures) : null
}

// « dans 3 jours », « in 2 months »… — l'unité la plus grande qui tombe
// au moins une fois dans le délai restant.
const UNITES = [
  ['year', 365 * 24 * 3600e3],
  ['month', 30 * 24 * 3600e3],
  ['day', 24 * 3600e3],
  ['hour', 3600e3],
  ['minute', 60e3]
]
export function tempsRestant(iso, langue, maintenant = Date.now()) {
  const delai = new Date(iso).getTime() - maintenant
  const rtf = new Intl.RelativeTimeFormat(langue === 'fr' ? 'fr' : 'en', { numeric: 'auto' })
  for (const [unite, ms] of UNITES) {
    if (delai >= ms) return rtf.format(Math.round(delai / ms), unite)
  }
  return rtf.format(1, 'minute')
}
