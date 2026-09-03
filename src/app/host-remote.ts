import type { GameContext } from '../game/types'
import type { GameEvent } from '../game/game-events'
import type { AudioEngineState } from '../audio/audio-engine'
import type { AppSettings } from './settings'

/**
 * Fjernstyring av spillet fra et eget vertsvindu (samme origin, egen fane/
 * popup) via BroadcastChannel. Hovedvinduet eier all spilltilstand, lyd og
 * animasjon; vertsvinduet er en tynn fjernkontroll som rendrer siste
 * tilstands-broadcast og sender kommandoer tilbake. Slik kan verten dele
 * hovedvinduet på prosjektor uten at deltakerne ser kontrollene — og
 * vertsvinduet kan trygt vise fasit privat.
 */

export const HOST_CHANNEL = 'shops-quiz-host'

export type RemoteState = {
  stateValue: unknown
  context: GameContext
  audio: AudioEngineState
  canUndo: boolean
  persistenceWarning: string | null
  settings: AppSettings
}

export type RemoteCommand =
  | { kind: 'send'; event: GameEvent }
  | { kind: 'audio'; action: 'toggle' | 'restart' | 'seek-back' | 'retry' }
  | { kind: 'undo' }
  | { kind: 'reset' }
  | { kind: 'skip' }
  | { kind: 'settings'; patch: Partial<AppSettings> }

export type ChannelMessage =
  | { type: 'ping' }
  | { type: 'state'; state: RemoteState }
  | { type: 'command'; command: RemoteCommand }

export type RemotePhase =
  | 'setup'
  | 'startingGame'
  | 'board'
  | 'presenting'
  | 'ready'
  | 'active'
  | 'open'
  | 'decided'
  | 'summary'
  | 'finale'

/** Flat fase fra XState-verdien ('setup' | { clue: 'active' } | …). */
export function remotePhase(stateValue: unknown): RemotePhase {
  if (typeof stateValue === 'string') {
    if (['setup', 'startingGame', 'board', 'summary', 'finale'].includes(stateValue)) {
      return stateValue as RemotePhase
    }
    return 'setup'
  }
  if (stateValue && typeof stateValue === 'object' && 'clue' in stateValue) {
    const sub = (stateValue as { clue: unknown }).clue
    if (sub === 'presenting' || sub === 'ready' || sub === 'active' || sub === 'open' || sub === 'decided') return sub
  }
  return 'setup'
}

export function isRemoteWindow(): boolean {
  return new URLSearchParams(window.location.search).has('host')
}

/** Åpner (eller fokuserer) vertsvinduet som popup ved siden av hovedvinduet. */
export function openHostWindow() {
  const url = new URL(window.location.href)
  url.search = '?host=1'
  window.open(url.toString(), 'shops-quiz-host-window', 'popup=yes,width=560,height=860')
}
