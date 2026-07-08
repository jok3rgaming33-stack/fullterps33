// 1 point par euro dépensé (arrondi à l'entier inférieur)
export function pointsForAmount(totalEuros: number): number {
  return Math.floor(totalEuros)
}

/**
 * Paliers statiques utilisés côté client pour la barre de progression.
 * Ces valeurs correspondent aux paliers par défaut en DB.
 * L'admin peut créer des paliers supplémentaires via le panel.
 */
export function tierForPoints(points: number): { name: string; nextAt: number } {
  if (points < 300)  return { name: "Éclair",  nextAt: 300 }
  if (points < 500)  return { name: "Bronze",  nextAt: 500 }
  if (points < 900)  return { name: "Argent",  nextAt: 900 }
  return { name: "Or", nextAt: points }
}
