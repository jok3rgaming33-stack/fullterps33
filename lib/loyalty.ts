// 1 point par euro dépensé (arrondi à l'entier inférieur)
export function pointsForAmount(totalEuros: number): number {
  return Math.floor(totalEuros)
}

export function tierForPoints(points: number): { name: string; nextAt: number } {
  if (points < 200) return { name: "Éclair", nextAt: 200 }
  if (points < 500) return { name: "Orage", nextAt: 500 }
  if (points < 1000) return { name: "Tempête", nextAt: 1000 }
  return { name: "Ouragan", nextAt: points }
}
