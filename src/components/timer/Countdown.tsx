import { useEffect, useRef, useState } from 'react'
import { useSelector } from '@xstate/react'
import { useGame } from '../../app/GameProvider'
import { idleTimer, remainingMs } from '../../game/timer'
import styles from './timer.module.css'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Stor, alltid synlig nedtelling. Beregner fra absolutt deadline via rAF —
 * React re-rendres ikke per frame; DOM oppdateres direkte.
 */
export function Countdown({ onFinalTick }: { onFinalTick?: (seconds: number) => void }) {
  const { actorRef, send } = useGame()
  const timer = useSelector(actorRef, (s) => s.context.timer)
  const textRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const expiredSentRef = useRef(false)
  const lastSecondRef = useRef<number | null>(null)

  useEffect(() => {
    expiredSentRef.current = false
    if (timer.status !== 'running') return
    let frame = 0

    // Backup for skjulte faner: rAF stopper der, men setInterval kjører
    // (throttlet) — deadline er absolutt, så utløpet fanges uansett.
    const expiryBackup =
      timer.status === 'running'
        ? window.setInterval(() => {
            if (remainingMs(timer) <= 0 && !expiredSentRef.current) {
              expiredSentRef.current = true
              send({ type: 'COUNTDOWN_EXPIRED' })
            }
          }, 500)
        : null

    function paint() {
      const ms = remainingMs(timer)
      const duration = timer.durationMs ?? 1
      const seconds = Math.ceil(ms / 1000)
      const fraction = Math.max(0, Math.min(1, ms / duration))

      if (seconds !== lastSecondRef.current) {
        lastSecondRef.current = seconds
        if (timer.status === 'running' && seconds >= 1 && seconds <= 3) {
          onFinalTick?.(seconds)
        }
      }

      if (textRef.current) textRef.current.textContent = String(seconds)
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fraction))
      }
      if (wrapRef.current) {
        wrapRef.current.dataset.urgency =
          timer.status !== 'running' ? 'frozen' : seconds <= 5 ? 'critical' : seconds <= 10 ? 'high' : 'calm'
      }

      if (timer.status === 'running') {
        if (ms <= 0 && !expiredSentRef.current) {
          expiredSentRef.current = true
          send({ type: 'COUNTDOWN_EXPIRED' })
          return
        }
        frame = requestAnimationFrame(paint)
      }
    }

    paint()
    return () => {
      cancelAnimationFrame(frame)
      if (expiryBackup !== null) window.clearInterval(expiryBackup)
    }
  }, [timer, send, onFinalTick])

  return (
    <div ref={wrapRef} className={styles.countdown} data-urgency="calm">
      <svg viewBox="0 0 120 120" className={styles.ringSvg} aria-hidden>
        <circle cx="60" cy="60" r={RADIUS} className={styles.ringTrack} />
        <circle
          ref={ringRef}
          cx="60"
          cy="60"
          r={RADIUS}
          className={styles.ringFill}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={0}
        />
      </svg>
      <span ref={textRef} className={styles.seconds}>
        {Math.ceil(remainingMs(timer) / 1000)}
      </span>
      {timer.status === 'paused' && <span className={styles.pausedBadge}>PAUSE</span>}
    </div>
  )
}

export function AnswerWindowCountdown() {
  const { actorRef, send } = useGame()
  const timer = useSelector(actorRef, (s) => s.context.answerWindowTimer ?? idleTimer)
  const [seconds, setSeconds] = useState(() => Math.ceil(remainingMs(timer) / 1000))
  const expiredSentRef = useRef(false)

  useEffect(() => {
    expiredSentRef.current = false
    let frame = 0

    function paint() {
      const ms = remainingMs(timer)
      const nextSeconds = Math.max(0, Math.ceil(ms / 1000))
      setSeconds((current) => (current === nextSeconds ? current : nextSeconds))

      if (ms <= 0) {
        if (!expiredSentRef.current) {
          expiredSentRef.current = true
          send({ type: 'ANSWER_WINDOW_EXPIRED' })
        }
        return
      }
      frame = requestAnimationFrame(paint)
    }

    const expiryBackup = window.setInterval(() => {
      if (remainingMs(timer) <= 0 && !expiredSentRef.current) {
        expiredSentRef.current = true
        send({ type: 'ANSWER_WINDOW_EXPIRED' })
      }
    }, 500)
    paint()

    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(expiryBackup)
    }
  }, [timer, send])

  if (timer.status !== 'running') return null

  return (
    <div className={styles.answerWindow} role="timer" aria-live="polite">
      <span className={styles.answerWindowLabel}>Avgi svar</span>
      {seconds > 0 && (
        <span key={seconds} className={styles.answerWindowNumber}>
          {seconds}
        </span>
      )}
    </div>
  )
}
