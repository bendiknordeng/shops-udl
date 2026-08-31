import type { GamePack, ManualTeam, Participant } from '../content/schemas'
import type { Team } from './types'

/** Uniform Fisher–Yates med crypto-tilfeldighet. */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input]
  const rand = new Uint32Array(1)
  for (let i = arr.length - 1; i > 0; i--) {
    crypto.getRandomValues(rand)
    const j = rand[0] % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Stokker deltakerlisten og deler sekvensielt ut på lag.
 * Størrelsesforskjell mellom største og minste lag blir maks 1.
 */
export function allocateRandomTeams(participants: readonly Participant[], teamCount: number): Team[] {
  const shuffled = shuffle(participants)
  const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
    id: `team-${i + 1}`,
    name: '',
    participantIds: [],
    score: 0,
  }))
  shuffled.forEach((p, i) => {
    teams[i % teamCount].participantIds.push(p.id)
  })
  return teams
}

/** Bygger lag fra manualTeams-konfigurasjonen i spillpakken. */
export function allocateManualTeams(manualTeams: readonly ManualTeam[]): Team[] {
  return manualTeams.map((t, i) => ({
    id: `team-${i + 1}`,
    name: t.name ?? '',
    participantIds: [...t.participantIds],
    score: 0,
    nameLocked: Boolean(t.name),
  }))
}

/** Forventede lagstørrelser for en gitt fordeling (f.eks. «6, 6, 5»). */
export function expectedTeamSizes(participantCount: number, teamCount: number): number[] {
  const base = Math.floor(participantCount / teamCount)
  const extra = participantCount % teamCount
  return Array.from({ length: teamCount }, (_, i) => base + (i < extra ? 1 : 0))
}

/**
 * Trekker unike lagnavn fra navnebanken. Lag med fast navn fra manualTeams
 * beholder navnet sitt; alle andre får nytt.
 */
export function drawTeamNames(pack: GamePack, teams: readonly Team[]): string[] {
  const locked = new Set(
    teams
      .filter((t) => t.nameLocked)
      .map((t) => t.name.trim().toLocaleLowerCase('nb-NO')),
  )
  const available = pack.teamNames.filter((n) => !locked.has(n.trim().toLocaleLowerCase('nb-NO')))
  const drawn = shuffle(available)
  let cursor = 0
  return teams.map((t) => {
    if (t.nameLocked) return t.name
    return drawn[cursor++] ?? `Lag ${cursor}`
  })
}
