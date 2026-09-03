import { useEffect, useState } from 'react'
import { useSelector } from '@xstate/react'
import { useGame } from '../../app/GameProvider'
import { audioEngine, type AudioEngineState } from '../../audio/audio-engine'
import { sceneBus } from '../../app/scene-bus'
import { openHostWindow } from '../../app/host-remote'
import { getClue } from '../../game/selectors'
import { SettingsPanel } from './SettingsPanel'
import styles from './host.module.css'

const DOCK_OPEN_KEY = 'shops-quiz:dock-open'

type PendingDecision = { kind: 'award'; teamId: string } | { kind: 'none' } | null

/**
 * Kompakt, sammenleggbar vertsdock. Ugyldige handlinger skjules/deaktiveres
 * etter spillfase (GAME_SPEC §7.3). Poengavgjørelser forhåndsvises tydelig
 * før de gjennomføres (§8.4).
 */
export function HostDock({ remoteConnected = false }: { remoteConnected?: boolean }) {
  const { actorRef, send, undo, canUndo, pack, persistenceWarning } = useGame()
  const snapshot = useSelector(actorRef, (s) => s)
  const context = snapshot.context
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(DOCK_OPEN_KEY) !== '0'
    } catch {
      return true
    }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [pending, setPending] = useState<PendingDecision>(null)
  const [audioState, setAudioState] = useState<AudioEngineState>(audioEngine.getState())

  useEffect(() => audioEngine.subscribe(setAudioState), [])

  useEffect(() => {
    try {
      sessionStorage.setItem(DOCK_OPEN_KEY, open ? '1' : '0')
    } catch {
      // ignorer
    }
  }, [open])

  // Vertsvindu tilkoblet → gjem docken fra den delte skjermen. Verten kan
  // fortsatt åpne den manuelt.
  useEffect(() => {
    if (remoteConnected) setOpen(false)
  }, [remoteConnected])

  const inCluePhase = snapshot.matches('clue')
  const clueReady = snapshot.matches({ clue: 'ready' })
  const clueStarted =
    snapshot.matches({ clue: 'active' }) ||
    snapshot.matches({ clue: 'open' }) ||
    snapshot.matches({ clue: 'decided' })
  const clue = getClue(pack, context.activeClueId)

  // Nullstill ventende avgjørelse når fasen endres.
  useEffect(() => {
    setPending(null)
  }, [context.activeClueId, context.usedClueIds.length])

  function confirmPending() {
    if (!pending) return
    if (pending.kind === 'award') send({ type: 'AWARD_CLUE', teamId: pending.teamId })
    else send({ type: 'NO_CORRECT_ANSWER' })
    setPending(null)
  }

  const isAudioClue = clue?.media.kind === 'audio'
  const canDecide = snapshot.matches({ clue: 'active' }) || snapshot.matches({ clue: 'open' })
  const timerStatus = context.timer.status
  const activeTeam = context.teams[context.activeTeamIndex] ?? null

  if (!open) {
    return (
      <div className={styles.dockWrap}>
        <div className={`${styles.dock} ${styles.dockCollapsed}`}>
          <button type="button" className={styles.toggleButton} onClick={() => setOpen(true)}>
            ▲ Kontroller{remoteConnected ? ' · styres fra kontrollvinduet' : ''}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dockWrap}>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      <div className={styles.dock}>
        <button type="button" className={styles.toggleButton} onClick={() => setOpen(false)}>
          ▼
        </button>

        {activeTeam && (
          <div className={styles.activeTurn} aria-label={`Tur: ${activeTeam.name}`}>
            <span className={styles.activeTurnLabel}>Tur</span>
            <strong className={styles.activeTurnName}>{activeTeam.name}</strong>
          </div>
        )}

        {/* Media-kontroller */}
        {inCluePhase && isAudioClue && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Lyd</span>
            <button
              type="button"
              className={styles.hostButton}
              disabled={audioState.status === 'loading' || audioState.status === 'error'}
              onClick={() => audioEngine.toggle()}
            >
              {audioState.status === 'playing' ? '⏸ Pause' : '▶ Spill'}
            </button>
            <button
              type="button"
              className={styles.hostButton}
              disabled={audioState.status === 'loading' || audioState.status === 'error'}
              onClick={() => audioEngine.restart()}
            >
              ↺ Fra start
            </button>
            <button
              type="button"
              className={styles.hostButton}
              disabled={audioState.status !== 'playing' && audioState.status !== 'paused'}
              onClick={() => audioEngine.seekBy(-5)}
            >
              −5s
            </button>
            {audioState.status === 'error' && (
              <button
                type="button"
                className={`${styles.hostButton} ${styles.hostButtonDanger}`}
                onClick={() => {
                  send({ type: 'RETRY_MEDIA' })
                  audioEngine.retry()
                }}
              >
                Prøv lyd igjen
              </button>
            )}
          </div>
        )}

        {clueReady && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Gjør dere klare</span>
            <button
              type="button"
              className={`${styles.hostButton} ${styles.hostButtonPrimary}`}
              onClick={() => send({ type: 'START_CLUE' })}
            >
              ▶ Start spørsmål
            </button>
          </div>
        )}

        {/* Bilde-kontroller */}
        {clueStarted && clue?.media.kind === 'image' && (
          <div className={styles.group}>
            <button
              type="button"
              className={styles.hostButton}
              onClick={() => send({ type: 'TOGGLE_MEDIA_HIDDEN' })}
            >
              {context.mediaHidden ? 'Vis bilde' : 'Skjul bilde'}
            </button>
          </div>
        )}

        {/* Nedtelling */}
        {snapshot.matches({ clue: 'active' }) && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Tid</span>
            {timerStatus === 'running' && (
              <button type="button" className={styles.hostButton} onClick={() => send({ type: 'PAUSE_COUNTDOWN' })}>
                ⏸ Pause tid
              </button>
            )}
            {timerStatus === 'paused' && (
              <button type="button" className={styles.hostButton} onClick={() => send({ type: 'RESUME_COUNTDOWN' })}>
                ▶ Fortsett tid
              </button>
            )}
            <button type="button" className={styles.hostButton} onClick={() => send({ type: 'OPEN_ANSWER_PHASE' })}>
              Åpen svarfase
            </button>
          </div>
        )}

        {/* Fasit */}
        {clueStarted && (
          <div className={styles.group}>
            <button
              type="button"
              className={styles.hostButton}
              onClick={() => send({ type: context.revealed ? 'HIDE_ANSWER' : 'REVEAL_ANSWER' })}
            >
              {context.revealed ? 'Skjul fasit' : 'Vis fasit'}
            </button>
          </div>
        )}

        {/* Avgjørelse med tydelig forhåndsvisning */}
        {canDecide && clue && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Riktig svar</span>
            {pending ? (
              <div className={styles.confirmBox}>
                <span className={styles.confirmLabel}>
                  {pending.kind === 'award'
                    ? `+${clue.value} til ${context.teams.find((t) => t.id === pending.teamId)?.name}?`
                    : 'Ingen fikk riktig?'}
                </span>
                <button type="button" className={`${styles.hostButton} ${styles.hostButtonPrimary}`} onClick={confirmPending}>
                  Bekreft
                </button>
                <button type="button" className={styles.hostButton} onClick={() => setPending(null)}>
                  Avbryt
                </button>
              </div>
            ) : (
              <div className={styles.awardRow}>
                {context.teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    className={styles.hostButton}
                    onClick={() => setPending({ kind: 'award', teamId: team.id })}
                  >
                    {team.name}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.hostButton} ${styles.hostButtonDanger}`}
                  onClick={() => setPending({ kind: 'none' })}
                >
                  Ingen riktig
                </button>
              </div>
            )}
          </div>
        )}

        {/* Etter avgjørelse */}
        {snapshot.matches({ clue: 'decided' }) && (
          <div className={styles.group}>
            <button
              type="button"
              className={`${styles.hostButton} ${styles.hostButtonPrimary}`}
              onClick={() => send({ type: 'RETURN_TO_BOARD' })}
            >
              Til brettet
            </button>
          </div>
        )}

        {/* Avbryt rute uten å bruke den (feilklikk / rekonstruksjon) */}
        {inCluePhase && !snapshot.matches({ clue: 'decided' }) && (
          <div className={styles.group}>
            <button
              type="button"
              className={styles.hostButton}
              title="Lukk spørsmålet uten å bruke ruten eller flytte turen"
              onClick={() => send({ type: 'CANCEL_CLUE' })}
            >
              ✕ Avbryt rute
            </button>
          </div>
        )}

        {/* Oppsummering: host kan gå tilbake til brettet etter rekonstruksjon */}
        {snapshot.matches('summary') && (
          <div className={styles.group}>
            <button
              type="button"
              className={styles.hostButton}
              onClick={() => send({ type: 'BACK_TO_BOARD' })}
            >
              ← Tilbake til brettet
            </button>
          </div>
        )}

        {/* Aktivt lag (på brettet) */}
        {snapshot.matches('board') && context.teams.length > 0 && (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Tur</span>
            <select
              className={styles.hostButton}
              value={context.activeTeamIndex}
              onChange={(e) => send({ type: 'CHANGE_ACTIVE_TEAM', teamIndex: Number(e.target.value) })}
            >
              {context.teams.map((team, i) => (
                <option key={team.id} value={i}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Generelt */}
        <div className={styles.group}>
          <button
            type="button"
            className={styles.hostButton}
            disabled={!sceneBus.hasSkippable()}
            onClick={() => sceneBus.skipAll()}
          >
            ⏭ Hopp over animasjon
          </button>
          <button type="button" className={styles.hostButton} disabled={!canUndo} onClick={undo}>
            ↶ Angre
          </button>
          <button type="button" className={styles.hostButton} onClick={() => setShowSettings((v) => !v)}>
            ⚙ Innstillinger
          </button>
          <button
            type="button"
            className={styles.hostButton}
            onClick={openHostWindow}
            title="Åpne kontrollene i et eget, privat vindu (skjules fra delt skjerm)"
          >
            ⧉ Kontrollvindu{remoteConnected ? ' ✓' : ''}
          </button>
          <button
            type="button"
            className={styles.hostButton}
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen()
              else void document.documentElement.requestFullscreen()
            }}
          >
            ⛶
          </button>
        </div>

        <div className={styles.statusArea}>
          {context.mediaError && !snapshot.matches({ clue: 'presenting' }) && (
            <span className={styles.warning}>{context.mediaError}</span>
          )}
          {persistenceWarning && (
            <span className={styles.warning}>Lagring feiler — spillet kjører videre i minnet</span>
          )}
        </div>
      </div>
    </div>
  )
}
