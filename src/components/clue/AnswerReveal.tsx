import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { dur } from '../../app/motion'
import type { Clue } from '../../content/schemas'
import styles from './clue.module.css'

/**
 * Fasitpanel — mountes KUN etter at verten avslører. Svaret ligger aldri i
 * DOM før dette (GAME_SPEC §9.3).
 *
 * `visible=false` spiller panelet rolig ut og melder tilbake via `onHidden`
 * så forelderen kan unmounte.
 */
export function AnswerReveal({
  clue,
  visible,
  onHidden,
}: {
  clue: Clue
  visible: boolean
  onHidden: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = rootRef.current
      if (!el) return

      if (!visible) {
        const out = gsap.to(el, {
          opacity: 0,
          y: 10,
          duration: dur(0.22),
          ease: 'power2.in',
          onComplete: onHidden,
        })
        if (document.hidden) out.progress(1)
        return () => out.kill()
      }

      const tl = gsap.timeline()
      tl.from(el, { opacity: 0, y: 18, scale: 0.97, duration: dur(0.35), ease: 'power3.out' })
      tl.from(
        `.${styles.revealAnswer}`,
        { opacity: 0, y: 8, duration: dur(0.3), ease: 'power2.out' },
        '-=0.2',
      )
      if (document.hidden) tl.progress(1)
      return () => tl.kill()
    },
    { scope: rootRef, dependencies: [visible, clue.id] },
  )

  return (
    <div ref={rootRef} className={styles.reveal} data-anim="reveal">
      <span className={styles.revealAnswer}>{clue.answer}</span>
      {clue.acceptedAnswers.length > 0 && (
        <span className={styles.revealAliases}>Godtas også: {clue.acceptedAnswers.join(', ')}</span>
      )}
      {clue.explanation && <span className={styles.revealMeta}>{clue.explanation}</span>}
      {(clue.revealTitle || clue.revealArtist) && (
        <span className={styles.revealMeta}>
          {[clue.revealTitle, clue.revealArtist].filter(Boolean).join(' — ')}
        </span>
      )}
      {clue.language && <span className={styles.revealMeta}>Språk: {clue.language}</span>}
      {clue.bonusInfo && <span className={styles.revealMeta}>{clue.bonusInfo}</span>}
    </div>
  )
}
