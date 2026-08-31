import { useEffect, useRef } from 'react'
import { useSelector } from '@xstate/react'
import { useGame } from '../../app/GameProvider'
import { remainingMs } from '../../game/timer'
import { tick, timeUp } from '../../audio/sfx'
import styles from './timer.module.css'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Stor, alltid synlig nedtelling. Beregner fra absolutt deadline via rAF —
 * React re-rendres ikke per frame; DOM oppdateres direkte.
 */
export function Countdown() {
  const { actorRef, send } = useGame()
  const timer = useSelector(actorRef, (s) => s.context.timer)
  const textRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const expiredSentRef = useRef(false)
  const lastWholeSecondRef = useRef<number | null>(null)

  useEffect(() => {
    expiredSentRef.current = false
    lastWholeSecondRef.current = null
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

      if (textRef.current) textRef.current.textContent = String(seconds)
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fraction))
      }
      if (wrapRef.current) {
        wrapRef.current.dataset.urgency =
          timer.status !== 'running' ? 'frozen' : seconds <= 5 ? 'critical' : seconds <= 10 ? 'high' : 'calm'
      }

      if (timer.status === 'running') {
        // Tikkelyd de siste fem sekundene — økende rytme og spenning.
        if (seconds <= 5 && seconds >= 1 && seconds !== lastWholeSecondRef.current) {
          lastWholeSecondRef.current = seconds
          tick(seconds <= 3)
        }
        if (ms <= 0 && !expiredSentRef.current) {
          expiredSentRef.current = true
          timeUp()
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
  }, [timer, send])

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
