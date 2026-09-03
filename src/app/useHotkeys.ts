import { useEffect, useRef, useState } from 'react'
import { useSelector } from '@xstate/react'
import { useGame } from './GameProvider'
import { audioEngine } from '../audio/audio-engine'
import { sceneBus } from './scene-bus'
import { boardColumns, getClue, sortedByScore } from '../game/selectors'

const AWARD_CONFIRM_WINDOW_MS = 1500

type PendingAwardShortcut = {
  key: string
  clueId: string
  pressedAt: number
}

export type BoardKeyboardSelection = {
  mode: 'column' | 'row'
  index: number
}

/**
 * Dokumenterte tastatursnarveier for verten (se hjelpepanelet i vertsdocken).
 * Poengtildeling krever to påfølgende trykk på samme rangeringstall.
 */
export function useHotkeys() {
  const { actorRef, send, undo, pack } = useGame()
  const snapshot = useSelector(actorRef, (s) => s)
  const pendingAwardRef = useRef<PendingAwardShortcut | null>(null)
  const [boardMode, setBoardMode] = useState<BoardKeyboardSelection['mode']>('column')
  const [boardSelection, setBoardSelection] = useState<BoardKeyboardSelection | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      const inClue = typeof snapshot.value === 'object' && snapshot.value !== null && 'clue' in snapshot.value
      const clueStarted =
        snapshot.matches({ clue: 'active' }) ||
        snapshot.matches({ clue: 'open' }) ||
        snapshot.matches({ clue: 'decided' })
      const clue = getClue(pack, snapshot.context.activeClueId)
      const canAward = snapshot.matches({ clue: 'active' }) || snapshot.matches({ clue: 'open' })
      const onBoard = snapshot.matches('board')

      if (onBoard && e.key === "'") {
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
      if (onBoard && clearBoardSelectionKey && boardSelection) {
        e.preventDefault()
        setBoardSelection(null)
        return
      }

      if (onBoard && /^[1-5]$/.test(e.key)) {
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
        const cell = boardColumns(pack, snapshot.context.usedClueIds)[columnIndex]?.cells[rowIndex]
        if (!cell?.clue) return
        const tile = document.querySelector<HTMLElement>(`[data-clue-id="${cell.clue.id}"]`)
        sceneBus.lastTileRect = tile?.getBoundingClientRect() ?? null
        setBoardSelection(null)
        if (cell.used) send({ type: 'OPEN_USED_CLUE', clueId: cell.clue.id })
        else send({ type: 'OPEN_CLUE', clueId: cell.clue.id })
        return
      }

      if (canAward && /^[0-9]$/.test(e.key)) {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        e.preventDefault()
        if (e.repeat || !clue) return

        const now = Date.now()
        const pending = pendingAwardRef.current
        const confirmed =
          pending?.key === e.key &&
          pending.clueId === clue.id &&
          now - pending.pressedAt <= AWARD_CONFIRM_WINDOW_MS

        if (!confirmed) {
          pendingAwardRef.current = { key: e.key, clueId: clue.id, pressedAt: now }
          return
        }

        pendingAwardRef.current = null
        let team = null
        if (e.key === '0') {
          team = snapshot.context.teams[snapshot.context.activeTeamIndex] ?? null
        } else {
          team = sortedByScore(snapshot.context.teams)[Number(e.key) - 1] ?? null
        }
        if (team) send({ type: 'AWARD_CLUE', teamId: team.id })
        return
      }
      pendingAwardRef.current = null

      switch (e.key) {
        case 'Enter':
          if (snapshot.matches({ clue: 'ready' })) {
            e.preventDefault()
            send({ type: 'START_CLUE' })
          }
          break
        case 'Escape':
          if (sceneBus.skipAll()) e.preventDefault()
          break
        case 'x':
        case 'X':
          if (
            inClue &&
            !snapshot.matches({ clue: 'decided' }) &&
            !snapshot.matches({ clue: 'review' })
          ) {
            e.preventDefault()
            send({ type: 'CANCEL_CLUE' })
          }
          break
        case ' ':
          if (inClue && clue && clue.media.kind === 'audio') {
            e.preventDefault()
            if (e.repeat) break
            audioEngine.toggle()
          }
          break
        case 's':
        case 'S':
          if (
            clue?.media.kind === 'audio' &&
            (snapshot.matches({ clue: 'active' }) || snapshot.matches({ clue: 'open' }))
          ) {
            e.preventDefault()
            if (e.repeat) break
            send({ type: 'RESTART_CLUE' })
            audioEngine.restart()
          }
          break
        case 'p':
        case 'P':
          if (inClue && clue?.media.kind === 'audio') {
            e.preventDefault()
            if (e.repeat) break
            audioEngine.restart()
          }
          break
        case '+':
        case '-': {
          if (e.metaKey || e.ctrlKey || e.altKey) break
          const mainTimerRunning =
            snapshot.matches({ clue: 'active' }) && snapshot.context.timer.status === 'running'
          const answerWindowRunning =
            snapshot.matches({ clue: 'open' }) &&
            snapshot.context.answerWindowTimer?.status === 'running'
          if (!mainTimerRunning && !answerWindowRunning) break

          e.preventDefault()
          if (e.repeat) break
          const deltaSeconds = e.key === '+' ? 5 : -5
          send({ type: 'ADJUST_COUNTDOWN', deltaSeconds })
          break
        }
        case 'ArrowRight':
        case 'ArrowLeft': {
          const activeTimer = snapshot.matches({ clue: 'active' })
          const answerWindowTimer =
            snapshot.matches({ clue: 'open' }) &&
            snapshot.context.answerWindowTimer?.status === 'running'
          const reviewingAudio =
            snapshot.matches({ clue: 'review' }) && clue?.media.kind === 'audio'
          if (!activeTimer && !answerWindowTimer && !reviewingAudio) break

          e.preventDefault()
          let timerDeltaSeconds = 5
          let mediaDeltaSeconds = -5
          if (e.key === 'ArrowRight') {
            timerDeltaSeconds = -5
            mediaDeltaSeconds = 5
          }
          if (activeTimer || answerWindowTimer) {
            send({ type: 'ADJUST_COUNTDOWN', deltaSeconds: timerDeltaSeconds })
          }
          if (clue?.media.kind === 'audio') audioEngine.seekBy(mediaDeltaSeconds)
          break
        }
        case 'k':
        case 'K': {
          const status = snapshot.context.timer.status
          if (status === 'running') send({ type: 'PAUSE_COUNTDOWN' })
          else if (status === 'paused') send({ type: 'RESUME_COUNTDOWN' })
          break
        }
        case 'o':
        case 'O':
          if (snapshot.matches({ clue: 'active' })) send({ type: 'OPEN_ANSWER_PHASE' })
          break
        case 'f':
        case 'F':
          if (clueStarted) send({ type: snapshot.context.revealed ? 'HIDE_ANSWER' : 'REVEAL_ANSWER' })
          break
        case 'm':
        case 'M':
          if (clueStarted && clue?.media.kind === 'image') send({ type: 'TOGGLE_MEDIA_HIDDEN' })
          break
        case 'b':
        case 'B':
          if (snapshot.matches({ clue: 'decided' })) send({ type: 'RETURN_TO_BOARD' })
          if (snapshot.matches({ clue: 'review' })) send({ type: 'CLOSE_CLUE_REVIEW' })
          break
        case 'r':
        case 'R':
          if (
            snapshot.matches({ clue: 'decided' }) &&
            snapshot.context.lastOutcome?.kind === 'award'
          ) {
            e.preventDefault()
            if (e.repeat) break
            send({ type: 'RESET_CLUE_AWARD' })
          }
          break
        case 'u':
        case 'U':
          undo()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [snapshot, send, undo, pack, boardMode, boardSelection])

  useEffect(() => {
    if (snapshot.matches('board')) return
    setBoardSelection(null)
  }, [snapshot])

  return boardSelection
}

export const HOTKEY_HELP: { key: string; label: string }[] = [
  { key: 'Enter', label: 'Start spørsmål' },
  { key: "'", label: 'Bytt mellom kolonne- og radmodus' },
  { key: '1–5, 1–5', label: 'Marker akse, deretter åpne rute' },
  { key: 'X', label: 'Fjern markering / avbryt aktiv rute' },
  { key: '1–9 ×2', label: 'Gi riktig til laget på valgt plassering' },
  { key: '0 ×2', label: 'Gi riktig til laget med tur' },
  { key: 'Mellomrom', label: 'Spill av / pause lyd' },
  { key: 'S', label: 'Start sang og nedtelling på nytt' },
  { key: 'P', label: 'Start bare sangen på nytt' },
  { key: '+ / −', label: 'Legg til / trekk fra 5 s på aktiv timer' },
  { key: '←', label: '+5 s tid / 5 s tilbake i sang' },
  { key: '→', label: '−5 s tid / 5 s frem i sang' },
  { key: 'K', label: 'Pause / fortsett nedtelling' },
  { key: 'O', label: 'Gå til åpen svarfase' },
  { key: 'F', label: 'Vis / skjul fasit' },
  { key: 'M', label: 'Skjul / vis bilde' },
  { key: 'B', label: 'Tilbake til brettet' },
  { key: 'R', label: 'Trekk tilbake poeng på aktivt spørsmål' },
  { key: 'U', label: 'Angre siste poenghandling' },
]
