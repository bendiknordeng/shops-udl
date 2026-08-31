import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { dur } from '../../app/motion'
import styles from './scoreboard.module.css'

/**
 * Fysisk score-odometer: totalsummen ruller opp/ned ved endring — reagerer
 * på poengendring, aldri kontinuerlig uten grunn.
 */
export function ScoreOdometer({ value }: { value: number }) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const displayedRef = useRef(value)

  useEffect(() => {
    const el = spanRef.current
    if (!el) return
    const from = displayedRef.current
    if (from === value) return
    const proxy = { n: from }
    const tween = gsap.to(proxy, {
      n: value,
      duration: dur(0.8),
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = String(Math.round(proxy.n))
      },
      onComplete: () => {
        displayedRef.current = value
        el.textContent = String(value)
      },
    })
    gsap.fromTo(el, { scale: 1.25 }, { scale: 1, duration: dur(0.5), ease: 'back.out(2)' })
    return () => {
      tween.kill()
      displayedRef.current = value
      el.textContent = String(value)
    }
  }, [value])

  return (
    <span ref={spanRef} className={styles.score}>
      {displayedRef.current}
    </span>
  )
}
