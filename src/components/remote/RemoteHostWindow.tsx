import { useEffect, useRef, useState } from 'react'
import type { GamePack } from '../../content/schemas'
import type { GameEvent } from '../../game/game-events'
import type { BoardKeyboardSelection } from '../../app/useHotkeys'
import {
  DEFAULT_ANSWER_WINDOW_SECONDS,
  MAX_ANSWER_WINDOW_SECONDS,
  MIN_ANSWER_WINDOW_SECONDS,
} from '../../game/game-machine'
import { boardColumns, getCategory, getClue, sortedByScore } from '../../game/selectors'
import { remainingMs } from '../../game/timer'
import { teamColorStyle } from '../../game/team-colors'
import { CLUE_VALUES } from '../../content/schemas'
import {
  HOST_CHANNEL,
  remotePhase,
  type ChannelMessage,
  type RemoteCommand,
  type RemoteState,
} from '../../app/host-remote'
import { TYPE_LABELS } from '../common/TypeIcon'
import styles from './remote.module.css'

const STALE_MS = 4000
const AWARD_CONFIRM_WINDOW_MS = 1500
const REVEAL_CONFIRM_WINDOW_MS = 1500

const PHASE_LABELS: Record<ReturnType<typeof remotePhase>, string> = {
  setup: 'Oppsett (styres i hovedvinduet)',
  startingGame: 'Spillet starter …',
  board: 'Brettet — velg rute',
  presenting: 'Gjør klar rute …',
  ready: 'Gjør dere klare',
  active: 'Aktiv svarfase',
  answerDelay: 'Venter før svarrunde …',
  open: 'Åpen svarfase',
  decided: 'Avgjort — klar for brettet',
  review: 'Fasit og poeng',
  summary: 'Oppsummering',
  finale: 'Finale',
}

type PendingDecision = { kind: 'award'; teamId: string } | { kind: 'none' } | null
type PendingAwardShortcut = { key: string; clueId: string; pressedAt: number }
type PendingRevealShortcut = { clueId: string; pressedAt: number }

/**
 * VERTSVINDUET: privat fjernkontroll i egen popup/fane (?host=1).
 * Deles ikke på prosjektor — viser derfor fasit for aktiv rute hele tiden.
 * All tilstand kommer fra hovedvinduet via BroadcastChannel; dette vinduet
 * har ingen egen spilltilstand, lyd eller persistens.
 */
export function RemoteHostWindow({ pack }: { pack: GamePack }) {
  const [state, setState] = useState<RemoteState | null>(null)
  const [connected, setConnected] = useState(false)
  const [pending, setPending] = useState<PendingDecision>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const lastSeenRef = useRef(0)
  const pendingAwardRef = useRef<PendingAwardShortcut | null>(null)
  const pendingRevealRef = useRef<PendingRevealShortcut | null>(null)
  const [boardMode, setBoardMode] = useState<BoardKeyboardSelection['mode']>('column')
  const [boardSelection, setBoardSelection] = useState<BoardKeyboardSelection | null>(null)

  useEffect(() => {
    document.title = 'SHOPS UDL — Kontroller'
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(HOST_CHANNEL)
    channelRef.current = channel
    channel.onmessage = (e: MessageEvent<ChannelMessage>) => {
      if (e.data?.type === 'state') {
        lastSeenRef.current = Date.now()
        setConnected(true)
        setState(e.data.state)
      }
    }
    channel.postMessage({ type: 'ping' } satisfies ChannelMessage)
    const ping = window.setInterval(
      () => channel.postMessage({ type: 'ping' } satisfies ChannelMessage),
      1500,
    )
    const stale = window.setInterval(() => {
      if (Date.now() - lastSeenRef.current > STALE_MS) setConnected(false)
    }, 1000)
    return () => {
      window.clearInterval(ping)
      window.clearInterval(stale)
      channel.close()
      channelRef.current = null
    }
  }, [])

  function command(cmd: RemoteCommand) {
    channelRef.current?.postMessage({ type: 'command', command: cmd } satisfies ChannelMessage)
  }
  const sendEvent = (event: GameEvent) => command({ kind: 'send', event })

  const phase = state ? remotePhase(state.stateValue) : 'setup'
  const context = state?.context ?? null
  const clue = context ? getClue(pack, context.activeClueId) : null
  const category = clue ? getCategory(pack, clue.categoryId) : null
  const inClue =
    phase === 'presenting' ||
    phase === 'ready' ||
    phase === 'active' ||
    phase === 'answerDelay' ||
    phase === 'open' ||
    phase === 'decided' ||
    phase === 'review'
  const clueStarted = phase === 'active' || phase === 'open' || phase === 'decided'
  const canDecide = phase === 'active' || phase === 'open'
  const canRevealWithShortcut = phase === 'active' || phase === 'open'
  const activeTeam = context?.teams[context.activeTeamIndex] ?? null
  const answerWindowSeconds = context?.answerWindowSeconds ?? DEFAULT_ANSWER_WINDOW_SECONDS

  // Nullstill ventende avgjørelse ved rute-/faseskifte.
  const clueKey = context?.activeClueId ?? ''
  useEffect(() => setPending(null), [clueKey, phase])

  useEffect(() => {
    if (phase === 'board') return
    setBoardSelection(null)
  }, [phase])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      const revealShortcutKey = e.key === 'f' || e.key === 'F'
      if (!revealShortcutKey) pendingRevealRef.current = null
      if (phase === 'board' && e.key === "'") {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        e.preventDefault()
        if (e.repeat) return
        const nextMode = boardMode === 'column' ? 'row' : 'column'
        setBoardMode(nextMode)
        setBoardSelection((selection) => {
          if (!selection) return null
          return { ...selection, mode: nextMode }
        })
        return
      }
      const clearBoardSelectionKey = e.key === 'Escape' || e.key === 'x' || e.key === 'X'
      if (phase === 'board' && clearBoardSelectionKey && boardSelection) {
        e.preventDefault()
        setBoardSelection(null)
        return
      }
      if (phase === 'board' && context && /^[1-5]$/.test(e.key)) {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        e.preventDefault()
        if (e.repeat) return
        const digitIndex = Number(e.key) - 1

        if (!boardSelection) {
          setBoardSelection({ mode: boardMode, index: digitIndex })
          return
        }

        let columnIndex = digitIndex
        let rowIndex = boardSelection.index
        if (boardSelection.mode === 'column') {
          columnIndex = boardSelection.index
          rowIndex = digitIndex
        }
        const cell = boardColumns(pack, context.usedClueIds)[columnIndex]?.cells[rowIndex]
        if (!cell?.clue) return
        setBoardSelection(null)
        if (cell.used) sendEvent({ type: 'OPEN_USED_CLUE', clueId: cell.clue.id })
        else sendEvent({ type: 'OPEN_CLUE', clueId: cell.clue.id })
        return
      }
      if ((e.key === '+' || e.key === '-') && context) {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        const mainTimerRunning = phase === 'active' && context.timer.status === 'running'
        const answerWindowRunning =
          phase === 'open' && context.answerWindowTimer?.status === 'running'
        if (!mainTimerRunning && !answerWindowRunning) return

        e.preventDefault()
        if (e.repeat) return
        const deltaSeconds = e.key === '+' ? 5 : -5
        sendEvent({ type: 'ADJUST_COUNTDOWN', deltaSeconds })
        return
      }
      if (
        (e.key === 'r' || e.key === 'R') &&
        phase === 'decided' &&
        context?.lastOutcome?.kind === 'award'
      ) {
        e.preventDefault()
        if (!e.repeat) sendEvent({ type: 'RESET_CLUE_AWARD' })
        return
      }
      if (revealShortcutKey && canRevealWithShortcut && context && clue) {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        e.preventDefault()
        if (e.repeat) return
        if (context.revealed) {
          pendingRevealRef.current = null
          sendEvent({ type: 'HIDE_ANSWER' })
          return
        }

        const now = Date.now()
        const pendingReveal = pendingRevealRef.current
        const confirmed =
          pendingReveal?.clueId === clue.id &&
          now - pendingReveal.pressedAt <= REVEAL_CONFIRM_WINDOW_MS
        if (!confirmed) {
          pendingRevealRef.current = { clueId: clue.id, pressedAt: now }
          return
        }

        pendingRevealRef.current = null
        sendEvent({ type: 'REVEAL_ANSWER' })
        return
      }
      if (!canDecide || !context || !clue) {
        pendingAwardRef.current = null
        return
      }
      if (!/^[0-9]$/.test(e.key)) {
        pendingAwardRef.current = null
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      if (e.repeat) return

      const now = Date.now()
      const pendingAward = pendingAwardRef.current
      const confirmed =
        pendingAward?.key === e.key &&
        pendingAward.clueId === clue.id &&
        now - pendingAward.pressedAt <= AWARD_CONFIRM_WINDOW_MS

      if (!confirmed) {
        pendingAwardRef.current = { key: e.key, clueId: clue.id, pressedAt: now }
        return
      }

      pendingAwardRef.current = null
      let team = null
      if (e.key === '0') {
        team = context.teams[context.activeTeamIndex] ?? null
      } else {
        team = sortedByScore(context.teams)[Number(e.key) - 1] ?? null
      }
      if (team) sendEvent({ type: 'AWARD_CLUE', teamId: team.id })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [boardMode, boardSelection, canDecide, canRevealWithShortcut, clue, context, pack, phase])

  if (!state || !context) {
    return (
      <div className={styles.window}>
        <Header connected={connected} />
        <div className={styles.waiting}>
          <span className={styles.title}>Venter på hovedvinduet …</span>
          <span className={styles.hint}>
            Ha spillet åpent i hovedvinduet (samme nettleser). Dette vinduet er kun
            for deg — del aldri det på skjermen.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.window}>
      <Header connected={connected} />

      <div className={styles.section}>
        <span className={styles.phaseLabel}>{PHASE_LABELS[phase]}</span>
        {phase === 'startingGame' && (
          <button type="button" className={styles.button} onClick={() => command({ kind: 'skip' })}>
            ⏭ Hopp til brettet
          </button>
        )}
        {state.persistenceWarning && (
          <span className={styles.warning}>Lagring feiler i hovedvinduet — spillet kjører i minnet</span>
        )}
        {context.mediaError && <span className={styles.warning}>{context.mediaError}</span>}
      </div>

      {activeTeam && (
        <div
          className={styles.activeTurnCard}
          style={teamColorStyle(context.activeTeamIndex)}
          aria-label={`Tur: ${activeTeam.name}`}
        >
          <span className={styles.activeTurnCardLabel}>Tur</span>
          <strong className={styles.activeTurnCardName}>{activeTeam.name}</strong>
        </div>
      )}

      {/* Lag og poeng */}
      {context.teams.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Lag</span>
          {context.teams.map((team, i) => (
            <div
              key={team.id}
              className={`${styles.teamRow} ${i === context.activeTeamIndex ? styles.teamRowActive : ''}`}
              style={teamColorStyle(i)}
            >
              <span className={styles.teamRowName}>{team.name}</span>
              {i === context.activeTeamIndex && <span className={styles.turnTag}>Tur</span>}
              <span className={styles.teamRowScore}>{team.score}</span>
            </div>
          ))}
          {phase === 'board' && (
            <div className={styles.row}>
              <span className={styles.hint}>Sett tur:</span>
              {context.teams.map((team, i) => (
                <button
                  key={team.id}
                  type="button"
                  className={styles.button}
                  disabled={i === context.activeTeamIndex}
                  onClick={() => sendEvent({ type: 'CHANGE_ACTIVE_TEAM', teamIndex: i })}
                >
                  {team.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brett: åpne rute herfra */}
      {phase === 'board' && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Åpne rute</span>
          <RemoteBoard
            pack={pack}
            usedClueIds={context.usedClueIds}
            keyboardSelection={boardSelection}
            onOpen={(clueId, used) => {
              if (used) sendEvent({ type: 'OPEN_USED_CLUE', clueId })
              else sendEvent({ type: 'OPEN_CLUE', clueId })
            }}
          />
          {pack.clues.every((clue) => context.usedClueIds.includes(clue.id)) && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => sendEvent({ type: 'VIEW_RESULTS' })}
            >
              Se resultater
            </button>
          )}
        </div>
      )}

      {/* Aktiv rute: privat fasit + kontroller */}
      {inClue && clue && category && (
        <>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              {category.title} · {clue.value} · {TYPE_LABELS[clue.type]}
            </span>
            <div className={styles.answerBox}>
              <span className={styles.answerLabel}>Fasit — kun synlig her</span>
              <span className={styles.answerText}>{clue.answer}</span>
              {clue.acceptedAnswers.length > 0 && (
                <span className={styles.answerMeta}>Godtas også: {clue.acceptedAnswers.join(', ')}</span>
              )}
              {clue.explanation && <span className={styles.answerMeta}>{clue.explanation}</span>}
              {(clue.revealTitle || clue.revealArtist) && (
                <span className={styles.answerMeta}>
                  {[clue.revealTitle, clue.revealArtist].filter(Boolean).join(' — ')}
                </span>
              )}
              {clue.language && <span className={styles.answerMeta}>Språk: {clue.language}</span>}
            </div>

            {phase === 'ready' && (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => sendEvent({ type: 'START_CLUE' })}
              >
                ▶ Start spørsmål
              </button>
            )}

            {clueStarted && (
              <RemoteTimer
                timer={context.timer}
                onPause={() => sendEvent({ type: 'PAUSE_COUNTDOWN' })}
                onResume={() => sendEvent({ type: 'RESUME_COUNTDOWN' })}
                onOpenPhase={phase === 'active' ? () => sendEvent({ type: 'OPEN_ANSWER_PHASE' }) : null}
              />
            )}

            <div className={styles.row}>
              {clue.media.kind === 'audio' && (
                <>
                  <button
                    type="button"
                    className={styles.button}
                    disabled={state.audio.status === 'loading' || state.audio.status === 'error'}
                    onClick={() => command({ kind: 'audio', action: 'toggle' })}
                  >
                    {state.audio.status === 'playing' ? '⏸ Pause lyd' : '▶ Spill lyd'}
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    disabled={state.audio.status === 'loading' || state.audio.status === 'error'}
                    onClick={() => command({ kind: 'audio', action: 'restart' })}
                  >
                    ↺ Fra start
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    disabled={state.audio.status !== 'playing' && state.audio.status !== 'paused'}
                    onClick={() => command({ kind: 'audio', action: 'seek-back' })}
                  >
                    −5s
                  </button>
                  {state.audio.status === 'error' && (
                    <button
                      type="button"
                      className={`${styles.button} ${styles.buttonDanger}`}
                      onClick={() => command({ kind: 'audio', action: 'retry' })}
                    >
                      Prøv lyd igjen
                    </button>
                  )}
                </>
              )}
              {clue.media.kind === 'image' && clueStarted && (
                <button type="button" className={styles.button} onClick={() => sendEvent({ type: 'TOGGLE_MEDIA_HIDDEN' })}>
                  {context.mediaHidden ? 'Vis bilde' : 'Skjul bilde'}
                </button>
              )}
              {clueStarted && (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => sendEvent({ type: context.revealed ? 'HIDE_ANSWER' : 'REVEAL_ANSWER' })}
                >
                  {context.revealed ? 'Skjul fasit på skjermen' : 'Vis fasit på skjermen'}
                </button>
              )}
              {phase === 'presenting' && context.mediaError && (
                <button type="button" className={styles.button} onClick={() => sendEvent({ type: 'SKIP_MEDIA' })}>
                  Hopp til svarfase
                </button>
              )}
              {phase !== 'decided' && (
                <button
                  type="button"
                  className={styles.button}
                  title="Lukk spørsmålet uten å bruke ruten eller flytte turen"
                  onClick={() => sendEvent({ type: 'CANCEL_CLUE' })}
                >
                  ✕ Avbryt rute
                </button>
              )}
            </div>
          </div>

          {canDecide && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Riktig svar — gi {clue.value} poeng</span>
              {pending ? (
                <div className={styles.confirmBox}>
                  <span className={styles.confirmLabel}>
                    {pending.kind === 'award'
                      ? `+${clue.value} til ${context.teams.find((t) => t.id === pending.teamId)?.name}?`
                      : 'Ingen fikk riktig?'}
                  </span>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    onClick={() => {
                      if (pending.kind === 'award') sendEvent({ type: 'AWARD_CLUE', teamId: pending.teamId })
                      else sendEvent({ type: 'NO_CORRECT_ANSWER' })
                      setPending(null)
                    }}
                  >
                    Bekreft
                  </button>
                  <button type="button" className={styles.button} onClick={() => setPending(null)}>
                    Avbryt
                  </button>
                </div>
              ) : (
                <div className={styles.row}>
                  {context.teams.map((team, index) => (
                    <button
                      key={team.id}
                      type="button"
                      className={`${styles.button} ${styles.teamButton}`}
                      style={teamColorStyle(index)}
                      onClick={() => setPending({ kind: 'award', teamId: team.id })}
                    >
                      {team.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonDanger}`}
                    onClick={() => setPending({ kind: 'none' })}
                  >
                    Ingen riktig
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'decided' && (
            <div className={styles.section}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => sendEvent({ type: 'RETURN_TO_BOARD' })}
              >
                Til brettet
              </button>
            </div>
          )}

          {phase === 'review' && (
            <div className={styles.section}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => sendEvent({ type: 'CLOSE_CLUE_REVIEW' })}
              >
                Til brettet
              </button>
            </div>
          )}
        </>
      )}

      {phase === 'finale' && (
        <div className={styles.section}>
          <button type="button" className={styles.button} onClick={() => sendEvent({ type: 'BACK_TO_BOARD' })}>
            Se brettet
          </button>
        </div>
      )}

      {/* Generelt + innstillinger */}
      <div className={styles.section}>
        <div className={styles.row}>
          <button
            type="button"
            className={styles.button}
            disabled={!state.canUndo}
            onClick={() => command({ kind: 'undo' })}
          >
            ↶ Angre
          </button>
          <button type="button" className={styles.button} onClick={() => command({ kind: 'skip' })}>
            ⏭ Hopp over animasjon
          </button>
        </div>

        <details className={styles.details}>
          <summary>Innstillinger og poengjustering</summary>
          <div className={styles.detailsBody}>
            <div className={styles.sliderRow}>
              Spørsmålstid
              <input
                type="range"
                min={pack.presentation.minAnswerSeconds}
                max={pack.presentation.maxAnswerSeconds}
                step={pack.presentation.answerSecondsStep}
                value={context.answerSeconds}
                onChange={(e) => sendEvent({ type: 'SET_ANSWER_SECONDS', seconds: Number(e.target.value) })}
              />
              <span className={styles.sliderValue}>{context.answerSeconds} s</span>
            </div>
            <div className={styles.sliderRow}>
              Avgi svar
              <input
                type="range"
                min={MIN_ANSWER_WINDOW_SECONDS}
                max={MAX_ANSWER_WINDOW_SECONDS}
                step={1}
                value={answerWindowSeconds}
                onChange={(e) =>
                  sendEvent({
                    type: 'SET_ANSWER_WINDOW_SECONDS',
                    seconds: Number(e.target.value),
                  })
                }
              />
              <span className={styles.sliderValue}>{answerWindowSeconds} s</span>
            </div>
            <div className={styles.sliderRow}>
              Musikk
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={state.settings.mediaVolume}
                onChange={(e) => command({ kind: 'settings', patch: { mediaVolume: Number(e.target.value) } })}
              />
              <span className={styles.sliderValue}>{Math.round(state.settings.mediaVolume * 100)}%</span>
            </div>
            {context.teams.map((team) => (
              <div key={team.id} className={styles.row}>
                <span className={styles.teamRowName}>{team.name}</span>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => sendEvent({ type: 'ADJUST_SCORE', teamId: team.id, delta: -100 })}
                >
                  −100
                </button>
                <span className={styles.teamRowScore}>{team.score}</span>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => sendEvent({ type: 'ADJUST_SCORE', teamId: team.id, delta: 100 })}
                >
                  +100
                </button>
              </div>
            ))}
            <span className={styles.hint}>
              Rekonstruer brett — marker ruter brukt/ubrukt (f.eks. for å gjenskape et
              tidligere spill; kan angres):
            </span>
            {boardColumns(pack, context.usedClueIds).map(({ category, cells }) => (
              <div key={category.id} className={styles.row}>
                <span className={styles.teamRowName}>{category.title}</span>
                {cells.map(({ value, clue, used }) => (
                  <button
                    key={value}
                    type="button"
                    className={styles.boardCell}
                    style={used ? { textDecoration: 'line-through', color: 'var(--ink-faint)' } : undefined}
                    disabled={!clue || clue.id === context.activeClueId || (phase !== 'board' && phase !== 'summary')}
                    title={used ? 'Marker som ubrukt' : 'Marker som brukt'}
                    onClick={() => clue && sendEvent({ type: 'SET_CLUE_USED', clueId: clue.id, used: !used })}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ))}
            {confirmReset ? (
              <div className={styles.confirmBox}>
                <span className={styles.confirmLabel}>Slette alt og starte helt på nytt?</span>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonDanger}`}
                  onClick={() => {
                    command({ kind: 'reset' })
                    setConfirmReset(false)
                  }}
                >
                  Ja, start på nytt
                </button>
                <button type="button" className={styles.button} onClick={() => setConfirmReset(false)}>
                  Avbryt
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={() => setConfirmReset(true)}
              >
                Start spillet helt på nytt …
              </button>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}

function Header({ connected }: { connected: boolean }) {
  return (
    <div className={styles.header}>
      <span className={styles.title}>KONTROLLER</span>
      <span className={styles.status}>
        <span className={`${styles.statusDot} ${connected ? styles.statusDotConnected : ''}`} />
        {connected ? 'Tilkoblet hovedvinduet' : 'Mistet kontakt — er hovedvinduet åpent?'}
      </span>
    </div>
  )
}

function RemoteBoard({
  pack,
  usedClueIds,
  keyboardSelection,
  onOpen,
}: {
  pack: GamePack
  usedClueIds: readonly string[]
  keyboardSelection: BoardKeyboardSelection | null
  onOpen: (clueId: string, used: boolean) => void
}) {
  const columns = boardColumns(pack, usedClueIds)
  return (
    <div
      className={styles.boardGrid}
      style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
    >
      {columns.map(({ category }, columnIndex) => (
        <span
          key={category.id}
          className={`${styles.boardHeaderCell} ${keyboardSelection?.mode === 'column' && keyboardSelection.index === columnIndex ? styles.boardHeaderCellKeyboardHighlighted : ''}`}
          style={keyboardSelection?.mode === 'column' && keyboardSelection.index === columnIndex ? ({ '--keyboard-step': 0 } as React.CSSProperties) : undefined}
          title={category.title}
        >
          {category.title}
        </span>
      ))}
      {CLUE_VALUES.map((value, rowIndex) =>
        columns.map(({ category, cells }, columnIndex) => {
          const cell = cells.find((c) => c.value === value)
          const clue = cell?.clue ?? null
          const keyboardHighlighted =
            (keyboardSelection?.mode === 'column' && keyboardSelection.index === columnIndex) ||
            (keyboardSelection?.mode === 'row' && keyboardSelection.index === rowIndex)
          let keyboardStep = columnIndex
          if (keyboardSelection?.mode === 'column') keyboardStep = rowIndex + 1
          return (
            <button
              key={`${category.id}-${value}`}
              type="button"
              className={`${styles.boardCell} ${cell?.used ? styles.boardCellUsed : ''} ${keyboardHighlighted ? styles.boardCellKeyboardHighlighted : ''}`}
              style={keyboardHighlighted ? ({ '--keyboard-step': keyboardStep } as React.CSSProperties) : undefined}
              disabled={!clue}
              onClick={() => clue && onOpen(clue.id, Boolean(cell?.used))}
            >
              {value}
            </button>
          )
        }),
      )}
    </div>
  )
}

function RemoteTimer({
  timer,
  onPause,
  onResume,
  onOpenPhase,
}: {
  timer: RemoteState['context']['timer']
  onPause: () => void
  onResume: () => void
  onOpenPhase: (() => void) | null
}) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (timer.status !== 'running') return
    const id = window.setInterval(() => forceTick((n) => n + 1), 250)
    return () => window.clearInterval(id)
  }, [timer])

  const seconds = Math.ceil(remainingMs(timer) / 1000)
  const statusLabel =
    timer.status === 'running'
      ? 'teller ned'
      : timer.status === 'paused'
        ? 'pauset'
        : timer.status === 'expired'
          ? 'tiden ute'
          : 'stoppet'

  return (
    <div className={styles.timerRow}>
      <span className={`${styles.timerValue} ${seconds <= 5 && timer.status === 'running' ? styles.timerValueUrgent : ''}`}>
        {seconds}
      </span>
      <span className={styles.timerStatus}>{statusLabel}</span>
      {timer.status === 'running' && (
        <button type="button" className={styles.button} onClick={onPause}>
          ⏸ Pause tid
        </button>
      )}
      {timer.status === 'paused' && (
        <button type="button" className={styles.button} onClick={onResume}>
          ▶ Fortsett tid
        </button>
      )}
      {onOpenPhase && (
        <button type="button" className={styles.button} onClick={onOpenPhase}>
          Åpen svarfase
        </button>
      )}
    </div>
  )
}
