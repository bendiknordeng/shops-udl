import { useRef } from 'react'
import { useSelector } from '@xstate/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useGame } from '../../app/GameProvider'
import { sceneBus } from '../../app/scene-bus'
import { dur } from '../../app/motion'
import { activeTeam, boardColumns } from '../../game/selectors'
import { whoosh } from '../../audio/sfx'
import { TypeIcon, TypeLegend, TYPE_LABELS } from '../common/TypeIcon'
import styles from './board.module.css'

export function BoardScene() {
  const { pack, actorRef, send } = useGame()
  const context = useSelector(actorRef, (s) => s.context)
  const isStarting = useSelector(actorRef, (s) => s.matches('startingGame'))
  const boardRef = useRef<HTMLDivElement>(null)

  const columns = boardColumns(pack, context.usedClueIds)
  const turnTeam = activeTeam(context)

  // Startskjermen transformeres til spillebrett: kaskade av kolonner og ruter.
  useGSAP(
    () => {
      if (!isStarting) return
      const tl = gsap.timeline({
        onComplete: () => send({ type: 'SCENE_DONE' }),
      })
      tl.from(`.${styles.categoryHeader}`, {
        y: -40,
        opacity: 0,
        stagger: dur(0.07),
        duration: dur(0.4),
        ease: 'power2.out',
      })
      tl.from(
        `.${styles.tile}`,
        {
          scale: 0.6,
          opacity: 0,
          stagger: { each: dur(0.02), grid: 'auto', from: 'start' },
          duration: dur(0.35),
          ease: 'back.out(1.5)',
          clearProps: 'transform,opacity',
        },
        '-=0.2',
      )
      const unregister = sceneBus.registerSkippable(() => tl.progress(1))
      // rAF kjører ikke i skjulte faner — fullfør umiddelbart så SCENE_DONE
      // aldri uteblir (GAME_SPEC §16: animasjon låser seg → hopp til slutt).
      if (document.hidden) tl.progress(1)
      return () => {
        unregister()
        tl.kill()
      }
    },
    { scope: boardRef, dependencies: [isStarting] },
  )

  function openClue(clueId: string, element: HTMLElement) {
    sceneBus.lastTileRect = element.getBoundingClientRect()
    whoosh()
    send({ type: 'OPEN_CLUE', clueId })
  }

  function handleTilePointer(e: React.PointerEvent<HTMLButtonElement>) {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    el.style.setProperty('--tilt-y', `${(px - 0.5) * 7}deg`)
    el.style.setProperty('--tilt-x', `${(0.5 - py) * 7}deg`)
    el.style.setProperty('--light-x', `${px * 100}%`)
    el.style.setProperty('--light-y', `${py * 100}%`)
  }

  function resetTilePointer(e: React.PointerEvent<HTMLButtonElement>) {
    const el = e.currentTarget
    el.style.setProperty('--tilt-y', '0deg')
    el.style.setProperty('--tilt-x', '0deg')
  }

  return (
    <div ref={boardRef} className={styles.board}>
      <div className={styles.header}>
        <span className={styles.boardTitle}>{pack.title}</span>
        {turnTeam && (
          <span className={styles.turnBanner}>
            Tur: <strong>{turnTeam.name}</strong> velger kategori og poeng
          </span>
        )}
      </div>

      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map(({ category, cells }) => (
          <div key={category.id} className={styles.column}>
            <div className={styles.categoryHeader}>{category.title}</div>
            {cells.map(({ value, clue, used }) => (
              <button
                key={`${category.id}-${value}`}
                type="button"
                className={`${styles.tile} ${used ? styles.tileUsed : ''}`}
                data-clue-id={clue?.id}
                disabled={used || !clue}
                onClick={(e) => clue && openClue(clue.id, e.currentTarget)}
                onPointerMove={handleTilePointer}
                onPointerLeave={resetTilePointer}
                aria-label={
                  clue ? `${category.title} ${value} poeng, ${TYPE_LABELS[clue.type]}` : 'Tom rute'
                }
              >
                <span className={styles.tileValue}>{used ? '✓' : value}</span>
                {clue && !used && (
                  <span className={styles.tileType}>
                    <TypeIcon type={clue.type} size={14} />
                    {TYPE_LABELS[clue.type]}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <TypeLegend />
      </div>
    </div>
  )
}
