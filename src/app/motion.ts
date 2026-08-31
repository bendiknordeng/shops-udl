/**
 * Felles bevegelseskontroll. Reduced motion (OS-preferanse) eller redusert
 * effekt-modus (vertsinnstilling) korter ned varigheter — mening beholdes.
 */

let reducedEffects = false

export function setReducedEffects(value: boolean) {
  reducedEffects = value
}

export function isReducedMotion(): boolean {
  if (reducedEffects) return true
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Skaler en GSAP-varighet (sekunder) etter bevegelsesmodus. */
export function dur(seconds: number): number {
  return isReducedMotion() ? Math.min(seconds * 0.3, 0.2) : seconds
}
