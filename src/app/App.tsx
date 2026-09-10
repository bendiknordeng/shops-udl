import { useEffect, useState } from 'react'
import { useSelector } from '@xstate/react'
import { GamePackError, loadGamePack } from '../content/load-pack'
import type { GamePack } from '../content/schemas'
import { clearSession, getSetting, loadSession, loadUndoStack } from '../storage/persistence'
import { DEFAULT_SETTINGS, SETTINGS_KEY, type AppSettings } from './settings'
import { GameProvider, useGame } from './GameProvider'
import { useHotkeys } from './useHotkeys'
import { isRemoteWindow, openHostWindow } from './host-remote'
import { sceneBus } from './scene-bus'
import { useHostRemoteServer } from './useHostRemoteServer'
import { RemoteHostWindow } from '../components/remote/RemoteHostWindow'
import { SetupScene } from '../components/setup/SetupScene'
import { BoardScene } from '../components/board/BoardScene'
import { ClueScene } from '../components/clue/ClueScene'
import { Leaderboard } from '../components/scoreboard/Leaderboard'
import { HostDock } from '../components/host/HostDock'
import { FinaleScene } from '../components/finale/FinaleScene'
import styles from './app.module.css'

type BootState =
  | { phase: 'loading' }
  | { phase: 'pack-error'; issues: string[] }
  | { phase: 'resume-choice'; pack: GamePack; snapshot: unknown; undoStack: unknown[]; settings: AppSettings }
  | { phase: 'ready'; pack: GamePack; snapshot: unknown | null; undoStack: unknown[]; settings: AppSettings }

function snapshotLooksCompatible(pack: GamePack, snapshot: unknown): boolean {
  if (!snapshot || typeof snapshot !== 'object') return false
  const context = (snapshot as { context?: { packId?: string; packVersion?: string } }).context
  return context?.packId === pack.id && context?.packVersion === pack.version
}

export function App() {
  // ?host=1 → privat vertsvindu: ren fjernkontroll uten egen spilltilstand,
  // lyd eller persistens. Hovedvinduet forblir autoriteten.
  if (isRemoteWindow()) {
    return <RemoteApp />
  }
  return <MainApp />
}

function RemoteApp() {
  try {
    const pack = loadGamePack()
    return <RemoteHostWindow pack={pack} />
  } catch (err) {
    return (
      <div className={styles.bootScreen}>
        <span className={styles.bootHint}>
          Spillpakken er ugyldig: {err instanceof GamePackError ? err.issues.join(' · ') : String(err)}
        </span>
      </div>
    )
  }
}

function MainApp() {
  const [boot, setBoot] = useState<BootState>({ phase: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      let pack: GamePack
      try {
        pack = loadGamePack()
      } catch (err) {
        if (!cancelled) {
          setBoot({
            phase: 'pack-error',
            issues: err instanceof GamePackError ? err.issues : [String(err)],
          })
        }
        return
      }
      const settings = await getSetting<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS)
      const session = await loadSession()
      if (cancelled) return
      if (
        session &&
        session.status === 'active' &&
        session.packId === pack.id &&
        session.packVersion === pack.version &&
        snapshotLooksCompatible(pack, session.snapshot)
      ) {
        const undoStack = await loadUndoStack()
        if (cancelled) return
        setBoot({ phase: 'resume-choice', pack, snapshot: session.snapshot, undoStack, settings })
        return
      }
      // Inkompatibel eller uinteressant økt: last aldri inn stille — start friskt.
      setBoot({ phase: 'ready', pack, snapshot: null, undoStack: [], settings })
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  if (boot.phase === 'loading') {
    return (
      <div className={styles.bootScreen}>
        <div className={styles.bootLogo}>
          AI&D Young <span>Dyrkes</span>
        </div>
        <span className={styles.bootHint}>Rigger scenen …</span>
      </div>
    )
  }

  if (boot.phase === 'pack-error') {
    return (
      <div className={styles.bootScreen}>
        <div className={styles.bootLogo}>
          AI&D Young <span>Dyrkes</span>
        </div>
        <span className={styles.bootHint}>Spillpakken er ugyldig — rett feilene og bygg på nytt:</span>
        <ul className={styles.errorList}>
          {boot.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (boot.phase === 'resume-choice') {
    return (
      <div className={styles.bootScreen}>
        <div className={styles.resumeCard}>
          <span className={styles.resumeTitle}>Det finnes et pågående spill</span>
          <span className={styles.resumeText}>
            Vil du fortsette der dere slapp, eller starte helt på nytt? Å starte på nytt sletter
            lag, poeng og fremdrift.
          </span>
          <div className={styles.resumeActions}>
            <button
              type="button"
              className="stageButton"
              onClick={() =>
                setBoot({
                  phase: 'ready',
                  pack: boot.pack,
                  snapshot: boot.snapshot,
                  undoStack: boot.undoStack,
                  settings: boot.settings,
                })
              }
            >
              Fortsett spillet
            </button>
            <button
              type="button"
              className="stageButton stageButton--ghost"
              onClick={() => {
                void clearSession()
                setBoot({
                  phase: 'ready',
                  pack: boot.pack,
                  snapshot: null,
                  undoStack: [],
                  settings: boot.settings,
                })
              }}
            >
              Start på nytt
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <GameProvider
      pack={boot.pack}
      initialSnapshot={boot.snapshot}
      initialUndoStack={boot.undoStack}
      initialSettings={boot.settings}
    >
      <GameShell />
    </GameProvider>
  )
}

function GameShell() {
  const { actorRef } = useGame()
  const boardKeyboardSelection = useHotkeys()
  const remoteConnected = useHostRemoteServer()

  // Skjules hovedvinduet mens en gate-animasjon kjører, fullfør den — rAF
  // stopper i skjulte faner og ville ellers fryse spillflyten.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) sceneBus.skipAll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const inSetup = useSelector(actorRef, (s) => s.matches('setup'))
  const inClue = useSelector(actorRef, (s) => s.matches('clue'))
  const inFinale = useSelector(actorRef, (s) => s.matches('finale'))

  if (inSetup) {
    return (
      <div className={styles.fullScene}>
        <button
          type="button"
          className={`stageButton stageButton--ghost stageButton--small ${styles.hostWindowButton}`}
          onClick={openHostWindow}
          title="Åpne kontrollene i et eget, privat vindu"
        >
          ⧉ Kontrollvindu{remoteConnected ? ' ✓' : ''}
        </button>
        <SetupScene />
      </div>
    )
  }

  return (
    <div className={`${styles.appFrame} ${inFinale ? styles.appFrameFinale : ''}`}>
      <div className={styles.stageArea}>
        <BoardScene keyboardSelection={boardKeyboardSelection} />
        {inClue && <ClueScene />}
        {inFinale && <FinaleScene />}
      </div>
      {!inFinale && (
        <div className={styles.sideArea}>
          <Leaderboard />
        </div>
      )}
      <div className={styles.dockArea}>
        <HostDock remoteConnected={remoteConnected} />
      </div>
    </div>
  )
}
