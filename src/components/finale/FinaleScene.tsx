import { useEffect, useRef } from 'react'
import { useSelector } from '@xstate/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useGame } from '../../app/GameProvider'
import { dur } from '../../app/motion'
import { sceneBus } from '../../app/scene-bus'
import { getParticipant, sortedByScore, winners } from '../../game/selectors'
import { launchConfetti } from '../../effects/confetti'
import { Avatar } from '../common/Avatar'
import styles from './finale.module.css'

/**
 * Vinnersekvens: resultatliste bygges nedenfra, vinnerlaget avsløres sist
 * med konfetti. Ved uavgjort feires alle vinnerlagene.
 * Verten kan gå tilbake for poengretting (GAME_SPEC §15).
 */
export function FinaleScene() {
  const { pack, actorRef, send } = useGame()
  const teams = useSelector(actorRef, (s) => s.context.teams)
  const sceneRef = useRef<HTMLDivElement>(null)
  const confettiRef = useRef<HTMLDivElement>(null)

  const sorted = sortedByScore(teams)
  const winningTeams = winners(teams)
  const runnersUp = sorted.filter((t) => !winningTeams.some((w) => w.id === t.id))

  useGSAP(
    () => {
      const tl = gsap.timeline()
      tl.from(`.${styles.finaleTitle}`, { y: -50, opacity: 0, duration: dur(0.6), ease: 'power3.out' })
      // Resultatliste avsløres fra sisteplass og opp.
      tl.from(
        `.${styles.resultRow}`,
        {
          y: 26,
          opacity: 0,
          stagger: { each: dur(0.25), from: 'end' },
          duration: dur(0.45),
          ease: 'power2.out',
        },
        '+=0.2',
      )
      tl.from(`.${styles.winnerCard}`, {
        scale: 0.4,
        opacity: 0,
        duration: dur(0.8),
        ease: 'elastic.out(0.8, 0.5)',
      })
      tl.from(`.${styles.finaleActions}`, { opacity: 0, duration: dur(0.4) })
      const unregister = sceneBus.registerSkippable(() => tl.progress(1))
      return () => {
        unregister()
        tl.kill()
      }
    },
    { scope: sceneRef },
  )

  useEffect(() => {
    let cleanup: (() => void) | null = null
    let cancelled = false
    if (confettiRef.current) {
      void launchConfetti(confettiRef.current).then((dispose) => {
        if (cancelled) dispose()
        else cleanup = dispose
      })
    }
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return (
    <div ref={sceneRef} className={styles.finale}>
      <div ref={confettiRef} className={styles.confettiLayer} />

      <h2 className={styles.finaleTitle}>{winningTeams.length > 1 ? 'UAVGJORT!' : 'VINNEREN ER'}</h2>

      {winningTeams.map((team) => (
        <div key={team.id} className={styles.winnerCard}>
          <span className={styles.winnerLabel}>
            {winningTeams.length > 1 ? 'Delt førsteplass' : 'Kveldens mestere'}
          </span>
          <span className={styles.winnerName}>{team.name}</span>
          <span className={styles.winnerScore}>{team.score} poeng</span>
          <div className={styles.winnerAvatars}>
            {team.participantIds.map((pid) => {
              const participant = getParticipant(pack, pid)
              if (!participant) return null
              return <Avatar key={pid} participant={participant} size={52} />
            })}
          </div>
        </div>
      ))}

      {runnersUp.length > 0 && (
        <div className={styles.resultList}>
          {runnersUp.map((team) => {
            const place = sorted.findIndex((t) => t.id === team.id) + 1
            return (
              <div key={team.id} className={styles.resultRow}>
                <span className={styles.resultPlace}>{place}.</span>
                <span className={styles.resultName}>{team.name}</span>
                <span className={styles.resultScore}>{team.score}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className={styles.finaleActions}>
        <button
          type="button"
          className="stageButton stageButton--ghost"
          onClick={() => send({ type: 'BACK_TO_SUMMARY' })}
        >
          Tilbake (poengretting)
        </button>
      </div>
    </div>
  )
}
