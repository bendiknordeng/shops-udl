export type Team = {
  id: string
  name: string
  participantIds: string[]
  score: number
  /** true når navnet er satt fast i manualTeams og ikke skal trekkes på nytt. */
  nameLocked?: boolean
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'expired'

export type TimerState = {
  status: TimerStatus
  /** Absolutt deadline (epoch ms) når status er 'running'. */
  deadline: number | null
  /** Gjenstående ms når status er 'paused' eller 'stopped'. */
  remainingMs: number | null
  /** Konfigurert varighet for gjeldende nedtelling. */
  durationMs: number | null
}

export type LastOutcome =
  | { kind: 'award'; teamId: string; clueId: string; value: number }
  | { kind: 'none'; clueId: string }
  | null

export type ClueResult = { kind: 'award'; teamId: string } | { kind: 'none' }

export type GameContext = {
  packId: string
  packVersion: string
  teamCount: number
  answerSeconds: number
  answerWindowSeconds: number
  teams: Team[]
  /** true når lagene kommer fra manualTeams i spillpakken. */
  manualAllocation: boolean
  activeTeamIndex: number
  /** Tidligere navnesett, for «gå tilbake til forrige navnesett». */
  nameHistory: string[][]
  usedClueIds: string[]
  clueResults: Record<string, ClueResult>
  activeClueId: string | null
  timer: TimerState
  answerWindowTimer: TimerState
  revealed: boolean
  mediaHidden: boolean
  mediaError: string | null
  lastOutcome: LastOutcome
}
