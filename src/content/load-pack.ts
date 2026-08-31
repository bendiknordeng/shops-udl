import participants from './participants.json'
import teamNames from './team-names.json'
import { gamePackDefinition } from './game-pack'
import { GamePackSchema, type GamePack } from './schemas'

export class GamePackError extends Error {
  issues: string[]
  constructor(issues: string[]) {
    super('Spillpakken er ugyldig')
    this.name = 'GamePackError'
    this.issues = issues
  }
}

let cached: GamePack | null = null

/** Fletter JSON-innhold inn i pakkedefinisjonen og validerer med Zod. Kaster GamePackError. */
export function loadGamePack(): GamePack {
  if (cached) return cached
  const result = GamePackSchema.safeParse({
    ...gamePackDefinition,
    participants,
    teamNames,
  })
  if (!result.success) {
    throw new GamePackError(
      result.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)),
    )
  }
  cached = result.data
  return cached
}
