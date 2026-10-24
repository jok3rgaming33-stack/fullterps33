export const RATING_AXES = [
  { key: "taste", label: "Goût" },
  { key: "bottle", label: "Flacon" },
  { key: "packaging", label: "Emballage" },
  { key: "delivery", label: "Livraison / retrait" },
] as const

export type RatingAxis = (typeof RATING_AXES)[number]["key"]
export type RatingScores = Record<RatingAxis, number>

export type ProductRatingSummary = {
  productId: string
  avgScore: number
  count: number
}

export function averageScore(scores: RatingScores): number {
  const total = RATING_AXES.reduce((sum, axis) => sum + scores[axis.key], 0)
  return Math.round((total / RATING_AXES.length) * 10) / 10
}

export function isRatingScore(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5
}
