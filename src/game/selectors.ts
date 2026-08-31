import type { Category, Clue, GamePack, Participant } from '../content/schemas'
import { CLUE_VALUES } from '../content/schemas'
import type { GameContext, Team } from './types'

export function getClue(pack: GamePack, clueId: string | null): Clue | null {
  if (!clueId) return null
  return pack.clues.find((c) => c.id === clueId) ?? null
}

export function getCategory(pack: GamePack, categoryId: string | null): Category | null {
  if (!categoryId) return null
  return pack.categories.find((c) => c.id === categoryId) ?? null
}

export function getParticipant(pack: GamePack, id: string): Participant | null {
  return pack.participants.find((p) => p.id === id) ?? null
}

export type BoardCell = {
  value: (typeof CLUE_VALUES)[number]
  clue: Clue | null
  used: boolean
}

export type BoardColumn = {
  category: Category
  cells: BoardCell[]
}

/** Brettmatrise: kategorier som kolonner, poengnivåer som rader. */
export function boardColumns(pack: GamePack, usedClueIds: readonly string[]): BoardColumn[] {
  const used = new Set(usedClueIds)
  return pack.categories.map((category) => ({
    category,
    cells: CLUE_VALUES.map((value) => {
      const clue = pack.clues.find((c) => c.categoryId === category.id && c.value === value) ?? null
      return { value, clue, used: clue ? used.has(clue.id) : true }
    }),
  }))
}

export function activeTeam(context: GameContext): Team | null {
  return context.teams[context.activeTeamIndex] ?? null
}

export function sortedByScore(teams: readonly Team[]): Team[] {
  return [...teams].sort((a, b) => b.score - a.score)
}

/** Vinnerlag — kan være flere ved uavgjort. */
export function winners(teams: readonly Team[]): Team[] {
  if (teams.length === 0) return []
  const top = Math.max(...teams.map((t) => t.score))
  return teams.filter((t) => t.score === top)
}
