export type AppSettings = {
  /** Volum for spørsmålsmedia (0–1). */
  mediaVolume: number
  /** Redusert effekt-modus for svakere maskinvare. */
  reducedEffects: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  mediaVolume: 0.9,
  reducedEffects: false,
}

export const SETTINGS_KEY = 'app-settings'
