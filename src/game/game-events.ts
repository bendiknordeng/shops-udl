import type { Team } from './types'

export type GameEvent =
  | { type: 'SET_TEAM_COUNT'; count: number }
  | { type: 'SET_ANSWER_SECONDS'; seconds: number }
  // Tilfeldighet beregnes i UI-laget (allocate-teams.ts) slik at maskinen er deterministisk.
  | { type: 'DRAW_TEAMS'; teams: Team[]; manual: boolean }
  | { type: 'DRAW_TEAM_NAMES'; names: string[] }
  | { type: 'RESTORE_PREVIOUS_NAMES' }
  | { type: 'EDIT_TEAM_NAME'; teamId: string; name: string }
  | { type: 'START_GAME' }
  | { type: 'SCENE_DONE' }
  | { type: 'OPEN_CLUE'; clueId: string }
  | { type: 'PRESENTATION_READY' }
  | { type: 'MEDIA_FAILED'; message: string }
  | { type: 'RETRY_MEDIA' }
  | { type: 'SKIP_MEDIA' }
  | { type: 'PAUSE_COUNTDOWN' }
  | { type: 'RESUME_COUNTDOWN' }
  | { type: 'COUNTDOWN_EXPIRED' }
  | { type: 'OPEN_ANSWER_PHASE' }
  | { type: 'REVEAL_ANSWER' }
  | { type: 'HIDE_ANSWER' }
  | { type: 'TOGGLE_MEDIA_HIDDEN' }
  | { type: 'AWARD_CLUE'; teamId: string }
  | { type: 'NO_CORRECT_ANSWER' }
  | { type: 'RETURN_TO_BOARD' }
  // Lukk spørsmålet uten å bruke ruten eller rotere tur — for å avbryte et
  // feilklikk eller rekonstruere tilstand fra et tidligere spill.
  | { type: 'CANCEL_CLUE' }
  // Rekonstruksjonsverktøy: marker en rute brukt/ubrukt manuelt.
  | { type: 'SET_CLUE_USED'; clueId: string; used: boolean }
  // Host-styrt retur fra oppsummeringen til brettet (etter rekonstruksjon).
  | { type: 'BACK_TO_BOARD' }
  | { type: 'CHANGE_ACTIVE_TEAM'; teamIndex: number }
  | { type: 'ADJUST_SCORE'; teamId: string; delta: number }
  | { type: 'START_FINALE' }
  | { type: 'BACK_TO_SUMMARY' }

/** Events som utløser undo-snapshot før de sendes (poeng-/avgjørelseshandlinger). */
export const UNDOABLE_EVENTS: ReadonlySet<GameEvent['type']> = new Set([
  'AWARD_CLUE',
  'NO_CORRECT_ANSWER',
  'ADJUST_SCORE',
  'SET_CLUE_USED',
])
