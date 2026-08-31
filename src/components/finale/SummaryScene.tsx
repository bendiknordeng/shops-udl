import { useRef } from 'react'
import { useSelector } from '@xstate/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useGame } from '../../app/GameProvider'
import { dur } from '../../app/motion'
import { sortedByScore } from '../../game/selectors'
import styles from './finale.module.css'

/**
 * Alle ruter er brukt. Spillet går ikke automatisk til vinnersekvens —
 * verten får oppsummering og velger når finalen starter (GAME_SPEC §15).
 * Poengretting gjøres via Innstillinger i vertsdocken.
 */
export function SummaryScene() {
  const { actorRef, send } = useGame()
  const teams = useSelector(actorRef, (s) => s.context.teams)
  const overlayRef = useRef<HTMLDivElement>(null)
  const sorted = sortedByScore(teams)

  useGSAP(
    () => {
      gsap.from(`.${styles.summaryCard}`, {
        y: 40,
        opacity: 0,
        duration: dur(0.5),
        ease: 'power3.out',
      })
      gsap.from(`.${styles.summaryRow}`, {
        x: -20,
        opacity: 0,
        stagger: dur(0.08),
        delay: dur(0.2),
        duration: dur(0.35),
      })
    },
    { scope: overlayRef },
  )

  return (
    <div ref={overlayRef} className={styles.summaryOverlay}>
      <div className={styles.summaryCard}>
        <h2 className={styles.summaryTitle}>Alle ruter er spilt!</h2>
        <div className={styles.summaryList}>
          {sorted.map((team) => (
            <div key={team.id} className={styles.summaryRow}>
              <span>{team.name}</span>
              <span className={styles.summaryRowScore}>{team.score}</span>
            </div>
          ))}
        </div>
        <button type="button" className="stageButton" onClick={() => send({ type: 'START_FINALE' })}>
          Start finalen
        </button>
      </div>
    </div>
  )
}
