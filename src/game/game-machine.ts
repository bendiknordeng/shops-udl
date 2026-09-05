import { assign, setup } from 'xstate'
import type { GamePack } from '../content/schemas'
import type { GameEvent } from './game-events'
import type { GameContext, Team } from './types'
import {
  adjustTimer,
  expireTimer,
  idleTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
} from './timer'

const normalize = (name: string) => name.trim().toLocaleLowerCase('nb-NO')

export const DEFAULT_ANSWER_WINDOW_SECONDS = 10
export const MIN_ANSWER_WINDOW_SECONDS = 1
export const MAX_ANSWER_WINDOW_SECONDS = 30

export function createInitialContext(pack: GamePack): GameContext {
  return {
    packId: pack.id,
    packVersion: pack.version,
    teamCount: pack.manualTeams ? pack.manualTeams.length : Math.min(...pack.allowedTeamCounts),
    answerSeconds: pack.defaultAnswerSeconds,
    answerSecondsByType: {
      image: pack.defaultAnswerSeconds,
      'ai-song': pack.defaultAnswerSeconds,
      song: pack.defaultAnswerSeconds,
    },
    answerWindowSeconds: DEFAULT_ANSWER_WINDOW_SECONDS,
    teams: [],
    manualAllocation: false,
    activeTeamIndex: 0,
    nameHistory: [],
    usedClueIds: [],
    clueResults: {},
    activeClueId: null,
    timer: idleTimer,
    answerWindowTimer: idleTimer,
    revealed: false,
    mediaHidden: false,
    mediaError: null,
    lastOutcome: null,
  }
}

export function canStartGame(pack: GamePack, context: GameContext): boolean {
  if (context.teams.length < 2) return false
  if (pack.clues.length === 0) return false
  const teamParticipantIds = new Set(
    pack.participants
      .filter((participant) => !participant.excludedFromTeams)
      .map((participant) => participant.id),
  )
  const allocated = context.teams.flatMap((t) => t.participantIds)
  if (allocated.length !== teamParticipantIds.size) return false
  if (new Set(allocated).size !== allocated.length) return false
  if (allocated.some((participantId) => !teamParticipantIds.has(participantId))) return false
  const names = context.teams.map((t) => normalize(t.name))
  if (names.some((n) => n.length === 0)) return false
  if (new Set(names).size !== names.length) return false
  return true
}

function findClue(pack: GamePack, clueId: string | null) {
  return pack.clues.find((c) => c.id === clueId) ?? null
}

/**
 * Spillmaskinen eier all meningsfull spilltilstand (STACK.md).
 * Tilfeldighet (trekning) skjer i UI-laget og sendes inn som event-payload,
 * slik at restore fra persistert snapshot aldri re-trekker noe.
 */
export function createGameMachine(pack: GamePack) {
  return setup({
    types: {
      context: {} as GameContext,
      events: {} as GameEvent,
    },
    guards: {
      canStartGame: ({ context }) => canStartGame(pack, context),
      clueAvailable: ({ context, event }) => {
        if (event.type !== 'OPEN_CLUE') return false
        if (context.usedClueIds.includes(event.clueId)) return false
        return findClue(pack, event.clueId) !== null
      },
      usedClueAvailable: ({ context, event }) => {
        if (event.type !== 'OPEN_USED_CLUE') return false
        if (!context.usedClueIds.includes(event.clueId)) return false
        return findClue(pack, event.clueId) !== null
      },
      allCluesUsed: ({ context }) => context.usedClueIds.length >= pack.clues.length,
      teamExists: ({ context, event }) =>
        event.type === 'AWARD_CLUE' && context.teams.some((t) => t.id === event.teamId),
      activeClueHasAward: ({ context }) =>
        context.lastOutcome?.kind === 'award' &&
        context.lastOutcome.clueId === context.activeClueId,
    },
    actions: {
      applyAward: assign(({ context, event }) => {
        if (event.type !== 'AWARD_CLUE') return {}
        const clue = findClue(pack, context.activeClueId)
        if (!clue) return {}
        return {
          teams: applyAwardToTeams(context.teams, event.teamId, clue.value),
          usedClueIds: [...context.usedClueIds, clue.id],
          clueResults: {
            ...(context.clueResults ?? {}),
            [clue.id]: { kind: 'award', teamId: event.teamId },
          },
          lastOutcome: { kind: 'award', teamId: event.teamId, clueId: clue.id, value: clue.value } as const,
          timer: stopTimer(context.timer),
          answerWindowTimer: stopTimer(context.answerWindowTimer ?? idleTimer),
        }
      }),
      applyNoCorrect: assign(({ context }) => {
        const clue = findClue(pack, context.activeClueId)
        if (!clue) return {}
        return {
          usedClueIds: [...context.usedClueIds, clue.id],
          clueResults: {
            ...(context.clueResults ?? {}),
            [clue.id]: { kind: 'none' },
          },
          lastOutcome: { kind: 'none', clueId: clue.id } as const,
          timer: stopTimer(context.timer),
          answerWindowTimer: stopTimer(context.answerWindowTimer ?? idleTimer),
        }
      }),
      resetClueAward: assign(({ context }) => {
        const outcome = context.lastOutcome
        if (outcome?.kind !== 'award' || outcome.clueId !== context.activeClueId) return {}
        const clueResults = { ...(context.clueResults ?? {}) }
        delete clueResults[outcome.clueId]
        return {
          teams: applyAwardToTeams(context.teams, outcome.teamId, -outcome.value),
          usedClueIds: context.usedClueIds.filter((id) => id !== outcome.clueId),
          clueResults,
          lastOutcome: null,
          timer: stopTimer(context.timer),
          answerWindowTimer: idleTimer,
        }
      }),
      clearClue: assign({
        activeClueId: null,
        timer: idleTimer,
        answerWindowTimer: idleTimer,
        revealed: false,
        mediaHidden: false,
        mediaError: null,
        lastOutcome: null,
      }),
      advanceTurn: assign({
        // Fast rundgang etter hver avsluttede rute (GAME_SPEC §8.5).
        activeTeamIndex: ({ context }) =>
          context.teams.length === 0 ? 0 : (context.activeTeamIndex + 1) % context.teams.length,
      }),
      beginCountdown: assign({
        timer: ({ context }) => {
          const clue = findClue(pack, context.activeClueId)
          const seconds = clue
            ? (context.answerSecondsByType?.[clue.type] ?? context.answerSeconds)
            : context.answerSeconds
          return startTimer(seconds)
        },
        answerWindowTimer: idleTimer,
        mediaError: null,
      }),
      beginAnswerWindow: assign({
        answerWindowTimer: ({ context }) =>
          startTimer(context.answerWindowSeconds ?? DEFAULT_ANSWER_WINDOW_SECONDS),
      }),
      setClueUsed: assign(({ context, event }) => {
        if (event.type !== 'SET_CLUE_USED') return {}
        if (!pack.clues.some((c) => c.id === event.clueId)) return {}
        const without = context.usedClueIds.filter((id) => id !== event.clueId)
        const clueResults = { ...(context.clueResults ?? {}) }
        if (!event.used) delete clueResults[event.clueId]
        return {
          usedClueIds: event.used ? [...without, event.clueId] : without,
          clueResults,
        }
      }),
    },
  }).createMachine({
    id: 'quiz',
    initial: 'setup',
    context: createInitialContext(pack),
    on: {
      SET_ANSWER_SECONDS: {
        // Gjelder fra neste spørsmål — aktiv nedtelling endres ikke (GAME_SPEC §6).
        actions: assign(({ event }) => {
          const seconds = Math.min(
            pack.presentation.maxAnswerSeconds,
            Math.max(pack.presentation.minAnswerSeconds, event.seconds),
          )
          return {
            answerSeconds: seconds,
            answerSecondsByType: { image: seconds, 'ai-song': seconds, song: seconds },
          }
        }),
      },
      SET_CLUE_TYPE_ANSWER_SECONDS: {
        actions: assign(({ context, event }) => {
          const seconds = Math.min(
            pack.presentation.maxAnswerSeconds,
            Math.max(pack.presentation.minAnswerSeconds, event.seconds),
          )
          const current = context.answerSecondsByType ?? {
            image: context.answerSeconds,
            'ai-song': context.answerSeconds,
            song: context.answerSeconds,
          }
          return {
            answerSecondsByType: { ...current, [event.clueType]: seconds },
          }
        }),
      },
      SET_ANSWER_WINDOW_SECONDS: {
        actions: assign({
          answerWindowSeconds: ({ event }) =>
            Math.min(
              MAX_ANSWER_WINDOW_SECONDS,
              Math.max(MIN_ANSWER_WINDOW_SECONDS, event.seconds),
            ),
        }),
      },
      ADJUST_SCORE: {
        actions: assign({
          teams: ({ context, event }) =>
            context.teams.map((t) =>
              t.id === event.teamId ? { ...t, score: t.score + event.delta } : t,
            ),
        }),
      },
      CHANGE_ACTIVE_TEAM: {
        guard: ({ context, event }) => event.teamIndex >= 0 && event.teamIndex < context.teams.length,
        actions: assign({ activeTeamIndex: ({ event }) => event.teamIndex }),
      },
    },
    states: {
      setup: {
        on: {
          SET_TEAM_COUNT: {
            guard: ({ event }) => pack.manualTeams === null && pack.allowedTeamCounts.includes(event.count),
            actions: assign({
              teamCount: ({ event }) => event.count,
              teams: [],
              nameHistory: [],
              activeTeamIndex: 0,
            }),
          },
          DRAW_TEAMS: {
            actions: assign({
              teams: ({ event }) => event.teams,
              manualAllocation: ({ event }) => event.manual,
              teamCount: ({ event }) => event.teams.length,
              nameHistory: [],
              activeTeamIndex: 0,
            }),
          },
          DRAW_TEAM_NAMES: {
            guard: ({ context, event }) => event.names.length === context.teams.length,
            actions: assign({
              nameHistory: ({ context }) => {
                const current = context.teams.map((t) => t.name)
                if (current.every((n) => n.trim().length === 0)) return context.nameHistory
                return [...context.nameHistory, current]
              },
              teams: ({ context, event }) =>
                context.teams.map((t, i) => ({ ...t, name: event.names[i] })),
            }),
          },
          RESTORE_PREVIOUS_NAMES: {
            guard: ({ context }) => context.nameHistory.length > 0,
            actions: assign({
              teams: ({ context }) => {
                const previous = context.nameHistory[context.nameHistory.length - 1]
                return context.teams.map((t, i) => ({ ...t, name: previous[i] ?? t.name }))
              },
              nameHistory: ({ context }) => context.nameHistory.slice(0, -1),
            }),
          },
          EDIT_TEAM_NAME: {
            guard: ({ context, event }) => {
              const name = event.name.trim()
              if (name.length === 0 || name.length > 32) return false
              return !context.teams.some(
                (t) => t.id !== event.teamId && normalize(t.name) === normalize(name),
              )
            },
            actions: assign({
              teams: ({ context, event }) =>
                context.teams.map((t) =>
                  t.id === event.teamId ? { ...t, name: event.name.trim() } : t,
                ),
            }),
          },
          START_GAME: { guard: 'canStartGame', target: 'startingGame' },
        },
      },

      // Startskjermen transformeres til spillebrett (GSAP-scene). SCENE_DONE
      // sendes ved naturlig slutt eller når verten hopper over.
      startingGame: {
        on: { SCENE_DONE: 'board' },
      },

      board: {
        on: {
          VIEW_RESULTS: {
            guard: 'allCluesUsed',
            target: 'finale',
          },
          // Rekonstruksjonsverktøy: sett brukt-status manuelt.
          SET_CLUE_USED: { actions: 'setClueUsed' },
          OPEN_CLUE: {
            guard: 'clueAvailable',
            target: 'clue',
            actions: assign({
              activeClueId: ({ event }) => (event.type === 'OPEN_CLUE' ? event.clueId : null),
              timer: idleTimer,
              answerWindowTimer: idleTimer,
              revealed: false,
              mediaHidden: false,
              mediaError: null,
              lastOutcome: null,
            }),
          },
          OPEN_USED_CLUE: {
            guard: 'usedClueAvailable',
            target: '#quiz.clue.review',
            actions: assign({
              activeClueId: ({ event }) =>
                event.type === 'OPEN_USED_CLUE' ? event.clueId : null,
              timer: idleTimer,
              answerWindowTimer: idleTimer,
              revealed: true,
              mediaHidden: false,
              mediaError: null,
              lastOutcome: null,
            }),
          },
        },
      },

      clue: {
        initial: 'presenting',
        on: {
          // Lukk uten å bruke ruten eller rotere tur (rekonstruksjon/feilklikk).
          // Etter avgjørelse (decided) er ruten alt brukt — da gjelder RETURN_TO_BOARD.
          CANCEL_CLUE: {
            guard: ({ context }) =>
              context.activeClueId !== null && !context.usedClueIds.includes(context.activeClueId),
            target: '#quiz.board',
            actions: 'clearClue',
          },
          REVEAL_ANSWER: { actions: assign({ revealed: true }) },
          HIDE_ANSWER: { actions: assign({ revealed: false }) },
          TOGGLE_MEDIA_HIDDEN: { actions: assign({ mediaHidden: ({ context }) => !context.mediaHidden }) },
          MEDIA_FAILED: { actions: assign({ mediaError: ({ event }) => event.message }) },
          RETRY_MEDIA: { actions: assign({ mediaError: null }) },
        },
        states: {
          // Media klargjøres og ruten ekspanderer. Svarfasen starter først
          // når presentasjonen er klar (GAME_SPEC §8.1).
          presenting: {
            on: {
              PRESENTATION_READY: { target: 'ready' },
              SKIP_MEDIA: { target: 'active', actions: 'beginCountdown' },
            },
          },
          // Media er ferdig lastet, men holdes tilbake til spørsmålet startes.
          ready: {
            on: {
              START_CLUE: { target: 'active', actions: 'beginCountdown' },
            },
          },
          // Aktiv svarfase — kun laget som valgte ruten har svarrett.
          active: {
            on: {
              PAUSE_COUNTDOWN: {
                guard: ({ context }) => context.timer.status === 'running',
                actions: assign({ timer: ({ context }) => pauseTimer(context.timer) }),
              },
              RESUME_COUNTDOWN: {
                guard: ({ context }) => context.timer.status === 'paused',
                actions: assign({ timer: ({ context }) => resumeTimer(context.timer) }),
              },
              ADJUST_COUNTDOWN: {
                actions: assign({
                  timer: ({ context, event }) => adjustTimer(context.timer, event.deltaSeconds),
                }),
              },
              RESTART_CLUE: { actions: 'beginCountdown' },
              COUNTDOWN_EXPIRED: {
                guard: ({ context }) => context.timer.status === 'running',
                target: 'answerDelay',
                actions: assign({
                  timer: ({ context }) => expireTimer(context.timer),
                  answerWindowTimer: idleTimer,
                }),
              },
              OPEN_ANSWER_PHASE: {
                target: 'answerDelay',
                actions: assign({
                  timer: ({ context }) => stopTimer(context.timer),
                  answerWindowTimer: idleTimer,
                }),
              },
              AWARD_CLUE: { guard: 'teamExists', target: 'decided', actions: 'applyAward' },
              NO_CORRECT_ANSWER: { target: 'decided', actions: 'applyNoCorrect' },
            },
          },
          // Fast scenepause før «Avgi svar» vises og nedtellingen starter.
          answerDelay: {
            after: {
              2000: { target: 'open', actions: 'beginAnswerWindow' },
            },
          },
          // Åpen svarfase — verten styrer de andre lagene muntlig.
          open: {
            on: {
              RESTART_CLUE: { target: 'active', actions: 'beginCountdown' },
              ANSWER_WINDOW_EXPIRED: {
                guard: ({ context }) => context.answerWindowTimer?.status === 'running',
                actions: assign({
                  answerWindowTimer: ({ context }) =>
                    expireTimer(context.answerWindowTimer ?? idleTimer),
                }),
              },
              ADJUST_COUNTDOWN: {
                guard: ({ context }) => context.answerWindowTimer?.status === 'running',
                actions: assign({
                  answerWindowTimer: ({ context, event }) =>
                    adjustTimer(context.answerWindowTimer ?? idleTimer, event.deltaSeconds),
                }),
              },
              AWARD_CLUE: { guard: 'teamExists', target: 'decided', actions: 'applyAward' },
              NO_CORRECT_ANSWER: { target: 'decided', actions: 'applyNoCorrect' },
            },
          },
          decided: {
            on: {
              RESET_CLUE_AWARD: {
                guard: 'activeClueHasAward',
                target: 'answerDelay',
                actions: 'resetClueAward',
              },
              RETURN_TO_BOARD: [
                {
                  guard: 'allCluesUsed',
                  target: '#quiz.finale',
                  actions: ['advanceTurn', 'clearClue'],
                },
                { target: '#quiz.board', actions: ['advanceTurn', 'clearClue'] },
              ],
            },
          },
          review: {
            on: {
              CLOSE_CLUE_REVIEW: {
                target: '#quiz.board',
                actions: 'clearClue',
              },
            },
          },
        },
      },

      // Eldre lagrede økter i oppsummering går rett videre til sluttskjermen.
      summary: {
        always: 'finale',
      },

      finale: {
        on: { BACK_TO_BOARD: 'board' },
      },
    },
  })
}

export type GameMachine = ReturnType<typeof createGameMachine>

function applyAwardToTeams(teams: Team[], teamId: string, value: number): Team[] {
  return teams.map((t) => (t.id === teamId ? { ...t, score: t.score + value } : t))
}
