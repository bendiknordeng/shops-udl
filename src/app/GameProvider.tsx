import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createActor, type Actor, type Snapshot } from 'xstate'
import type { GamePack } from '../content/schemas'
import { createGameMachine, type GameMachine } from '../game/game-machine'
import { UNDOABLE_EVENTS, type GameEvent } from '../game/game-events'
import {
  clearSession,
  onPersistenceStatus,
  saveSnapshot,
  saveUndoStack,
  setSetting,
} from '../storage/persistence'
import { audioEngine } from '../audio/audio-engine'
import { setSfxVolume } from '../audio/sfx'
import { setReducedEffects } from './motion'
import { SETTINGS_KEY, type AppSettings } from './settings'

export type GameActor = Actor<GameMachine>

type GameContextValue = {
  pack: GamePack
  actorRef: GameActor
  send: (event: GameEvent) => void
  undo: () => void
  canUndo: boolean
  resetGame: () => void
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  persistenceWarning: string | null
}

const GameReactContext = createContext<GameContextValue | null>(null)

export function useGame(): GameContextValue {
  const value = useContext(GameReactContext)
  if (!value) throw new Error('useGame må brukes innenfor GameProvider')
  return value
}

type Props = {
  pack: GamePack
  initialSnapshot: unknown | null
  initialUndoStack: unknown[]
  initialSettings: AppSettings
  children: ReactNode
}

function persistFromActor(pack: GamePack, actor: GameActor) {
  const snap = actor.getSnapshot()
  const status = snap.value === 'setup' && snap.context.teams.length === 0 ? 'setup' : 'active'
  void saveSnapshot({
    packId: pack.id,
    packVersion: pack.version,
    snapshot: actor.getPersistedSnapshot(),
    status,
  })
}

function createRunningActor(machine: GameMachine, snapshot: unknown | null): GameActor {
  // Ugyldig gjenopprettet tilstand settes i karantene fremfor å lastes:
  // feiler restore, starter vi friskt i stedet for å krasje.
  if (snapshot) {
    try {
      const actor = createActor(machine, { snapshot: snapshot as Snapshot<unknown> })
      actor.start()
      return actor
    } catch (err) {
      console.error('Kunne ikke gjenopprette lagret spilltilstand — starter på nytt:', err)
      void clearSession()
    }
  }
  const actor = createActor(machine)
  actor.start()
  return actor
}

export function GameProvider({ pack, initialSnapshot, initialUndoStack, initialSettings, children }: Props) {
  const machine = useMemo(() => createGameMachine(pack), [pack])
  const undoStackRef = useRef<unknown[]>(initialUndoStack)
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(initialUndoStack.length > 0)

  const [actorRef, setActorRef] = useState<GameActor>(() =>
    createRunningActor(machine, initialSnapshot),
  )

  // Anvend innstillinger på lyd- og effektlagene.
  useEffect(() => {
    audioEngine.setMediaVolume(settings.mediaVolume)
    setSfxVolume(settings.sfxVolume)
    setReducedEffects(settings.reducedEffects)
  }, [settings])

  useEffect(() => {
    onPersistenceStatus((status, message) => {
      setPersistenceWarning(status === 'failed' ? (message ?? 'Lagring feilet') : null)
    })
  }, [])

  // Hver meningsfull transisjon planlegger en smal, serialisert lagring.
  useEffect(() => {
    persistFromActor(pack, actorRef)
    const sub = actorRef.subscribe(() => persistFromActor(pack, actorRef))
    return () => sub.unsubscribe()
  }, [pack, actorRef])

  const send = useCallback(
    (event: GameEvent) => {
      if (UNDOABLE_EVENTS.has(event.type)) {
        const stack = undoStackRef.current
        stack.push(actorRef.getPersistedSnapshot())
        while (stack.length > pack.rules.maxUndoDepth) stack.shift()
        setCanUndo(true)
        void saveUndoStack(stack)
      }
      actorRef.send(event)
    },
    [actorRef, pack.rules.maxUndoDepth],
  )

  // Angre gjenoppretter forrige poengsum, rutestatus, spillfase og aktivt lag
  // ved å rehydrere maskinen fra snapshotet tatt før avgjørelsen.
  const undo = useCallback(() => {
    const stack = undoStackRef.current
    const snapshot = stack.pop()
    if (!snapshot) return
    setCanUndo(stack.length > 0)
    void saveUndoStack(stack)
    audioEngine.fadeOutAndStop(200)
    actorRef.stop()
    setActorRef(createRunningActor(machine, snapshot))
  }, [actorRef, machine, pack])

  const resetGame = useCallback(() => {
    undoStackRef.current = []
    setCanUndo(false)
    audioEngine.unload()
    void clearSession()
    actorRef.stop()
    setActorRef(createRunningActor(machine, null))
  }, [actorRef, machine, pack])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      void setSetting(SETTINGS_KEY, next)
      return next
    })
  }, [])

  const value = useMemo<GameContextValue>(
    () => ({
      pack,
      actorRef,
      send,
      undo,
      canUndo,
      resetGame,
      settings,
      updateSettings,
      persistenceWarning,
    }),
    [pack, actorRef, send, undo, canUndo, resetGame, settings, updateSettings, persistenceWarning],
  )

  return <GameReactContext.Provider value={value}>{children}</GameReactContext.Provider>
}
