import { useEffect } from 'react'
import { useSelector } from '@xstate/react'
import { useGame } from './GameProvider'
import { audioEngine } from '../audio/audio-engine'
import { sceneBus } from './scene-bus'
import { getClue } from '../game/selectors'

/**
 * Dokumenterte tastatursnarveier for verten (se hjelpepanelet i vertsdocken).
 * Destruktive handlinger (poengtildeling, omstart) har IKKE direkte snarvei —
 * de krever bekreftelse i UI.
 */
export function useHotkeys() {
  const { actorRef, send, undo, pack } = useGame()
  const snapshot = useSelector(actorRef, (s) => s)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      const inClue = typeof snapshot.value === 'object' && snapshot.value !== null && 'clue' in snapshot.value
      const clue = getClue(pack, snapshot.context.activeClueId)

      switch (e.key) {
        case 'Escape':
          if (sceneBus.skipAll()) e.preventDefault()
          break
        case ' ':
          if (inClue && clue && clue.media.kind === 'audio') {
            e.preventDefault()
            audioEngine.toggle()
          }
          break
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
          if (inClue) send({ type: snapshot.context.revealed ? 'HIDE_ANSWER' : 'REVEAL_ANSWER' })
          break
        case 'm':
        case 'M':
          if (inClue && clue?.media.kind === 'image') send({ type: 'TOGGLE_MEDIA_HIDDEN' })
          break
        case 'b':
        case 'B':
          if (snapshot.matches({ clue: 'decided' })) send({ type: 'RETURN_TO_BOARD' })
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
  }, [snapshot, send, undo, pack])
}

export const HOTKEY_HELP: { key: string; label: string }[] = [
  { key: 'Mellomrom', label: 'Spill av / pause lyd' },
  { key: 'K', label: 'Pause / fortsett nedtelling' },
  { key: 'O', label: 'Gå til åpen svarfase' },
  { key: 'F', label: 'Vis / skjul fasit' },
  { key: 'M', label: 'Skjul / vis bilde' },
  { key: 'B', label: 'Tilbake til brettet' },
  { key: 'U', label: 'Angre siste poenghandling' },
  { key: 'Esc', label: 'Hopp over animasjon' },
]
