import { useEffect, useRef, useState } from 'react'
import { useSelector } from '@xstate/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useGame } from '../../app/GameProvider'
import { sceneBus } from '../../app/scene-bus'
import { dur } from '../../app/motion'
import { audioEngine, type AudioEngineState } from '../../audio/audio-engine'
import { award as awardSfx } from '../../audio/sfx'
import { getCategory, getClue } from '../../game/selectors'
import { TypeIcon, TYPE_LABELS } from '../common/TypeIcon'
import { Countdown } from '../timer/Countdown'
import { Visualizer } from './Visualizer'
import { AnswerReveal } from './AnswerReveal'
import styles from './clue.module.css'

type CluePhase = 'presenting' | 'active' | 'open' | 'decided'

export function ClueScene() {
  const { pack, actorRef, send } = useGame()
  const snapshot = useSelector(actorRef, (s) => s)
  const context = snapshot.context
  const clue = getClue(pack, context.activeClueId)
  const category = getCategory(pack, clue?.categoryId ?? null)

  const phase: CluePhase = snapshot.matches({ clue: 'presenting' })
    ? 'presenting'
    : snapshot.matches({ clue: 'active' })
      ? 'active'
      : snapshot.matches({ clue: 'open' })
        ? 'open'
        : 'decided'

  const stageRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const [entranceDone, setEntranceDone] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [audioState, setAudioState] = useState<AudioEngineState>(audioEngine.getState())
  const [imageAttempt, setImageAttempt] = useState(0)
  const [imageFallback, setImageFallback] = useState(false)
  const audioStartedRef = useRef(false)
  const exitingRef = useRef(false)

  const chooserTeam = context.teams[context.activeTeamIndex] ?? null

  // Ruten løfter seg og ekspanderer til scene — fra klikket rute-rektangel.
  useGSAP(
    () => {
      const el = stageRef.current
      if (!el) return
      const from = sceneBus.lastTileRect
      const target = el.getBoundingClientRect()
      const tl = gsap.timeline({ onComplete: () => setEntranceDone(true) })
      if (from && target.width > 0) {
        tl.from(el, {
          x: from.left - target.left,
          y: from.top - target.top,
          scaleX: from.width / target.width,
          scaleY: from.height / target.height,
          transformOrigin: '0 0',
          duration: dur(0.55),
          ease: 'power3.inOut',
        })
      } else {
        tl.from(el, { opacity: 0, scale: 0.94, duration: dur(0.4), ease: 'power2.out' })
      }
      tl.from(
        `.${styles.header} > *`,
        { y: -16, opacity: 0, stagger: dur(0.06), duration: dur(0.3) },
        '-=0.15',
      )
      const unregister = sceneBus.registerSkippable(() => tl.progress(1))
      // Skjult fane får ingen rAF — fullfør entréen så PRESENTATION_READY
      // ikke blokkeres.
      if (document.hidden) tl.progress(1)
      return () => {
        unregister()
        tl.kill()
      }
    },
    { scope: stageRef },
  )

  // Media klargjøres: bilde dekodes / lyd preloades før ruten regnes som aktiv.
  useEffect(() => {
    if (!clue) return
    setMediaReady(false)
    audioStartedRef.current = false
    if (clue.media.kind === 'image') {
      let cancelled = false
      const img = new Image()
      img.src = clue.media.src
      img
        .decode()
        .then(() => {
          if (!cancelled) {
            setImageFallback(false)
            setMediaReady(true)
          }
        })
        .catch(() => {
          if (!cancelled) {
            // Nøytral placeholder + hostvarsel; spillet kan fortsette.
            setImageFallback(true)
            setMediaReady(true)
            send({ type: 'MEDIA_FAILED', message: 'Bildet kunne ikke lastes — viser placeholder' })
          }
        })
      return () => {
        cancelled = true
      }
    }
    audioEngine.load(clue.id, clue.media)
    return undefined
  }, [clue, imageAttempt, send])

  // Lydmotorens status → UI + maskinen.
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setAudioState(state)
      if (state.status === 'ready') setMediaReady(true)
      if (state.status === 'error' && state.error) {
        send({ type: 'MEDIA_FAILED', message: state.error })
      }
    })
    return unsubscribe
  }, [send])

  // Svarfasen starter når presentasjonen er klar (entré + media).
  useEffect(() => {
    if (phase === 'presenting' && entranceDone && mediaReady && !context.mediaError) {
      send({ type: 'PRESENTATION_READY' })
    }
  }, [phase, entranceDone, mediaReady, context.mediaError, send])

  // Lyd og nedtelling starter koordinert.
  useEffect(() => {
    if (phase === 'active' && clue?.media.kind === 'audio' && !audioStartedRef.current) {
      if (audioState.status === 'ready' || audioState.status === 'paused') {
        audioStartedRef.current = true
        audioEngine.play()
      }
    }
  }, [phase, clue, audioState.status])

  // Tidsutløp: scenen fryser tydelig uten å skjule media.
  useGSAP(
    () => {
      if (phase === 'open' && context.timer.status === 'expired' && flashRef.current) {
        gsap.fromTo(
          flashRef.current,
          { opacity: 0.55 },
          { opacity: 0, duration: dur(0.9), ease: 'power2.out' },
        )
      }
    },
    { scope: stageRef, dependencies: [phase] },
  )

  // Riktig svar: poengenergi flyttes til valgt lag.
  useGSAP(
    () => {
      if (phase !== 'decided' || context.lastOutcome?.kind !== 'award') return
      const chip = chipRef.current
      const stage = stageRef.current
      if (!chip || !stage) return
      awardSfx()
      const targetEl = document.querySelector(`[data-team-card="${context.lastOutcome.teamId}"]`)
      const stageRect = stage.getBoundingClientRect()
      const startX = stageRect.left + stageRect.width / 2
      const startY = stageRect.top + stageRect.height / 2
      const tl = gsap.timeline()
      tl.set(chip, { left: startX, top: startY, xPercent: -50, yPercent: -50, opacity: 0, scale: 0.5 })
      tl.to(chip, { opacity: 1, scale: 1.15, duration: dur(0.3), ease: 'back.out(2)' })
      if (targetEl) {
        const t = targetEl.getBoundingClientRect()
        tl.to(chip, {
          left: t.left + t.width / 2,
          top: t.top + t.height / 2,
          scale: 0.55,
          duration: dur(0.7),
          ease: 'power2.inOut',
          delay: dur(0.25),
        })
      }
      tl.to(chip, { opacity: 0, duration: dur(0.25) })
      const unregister = sceneBus.registerSkippable(() => tl.progress(1))
      return () => {
        unregister()
        tl.kill()
      }
    },
    { scope: stageRef, dependencies: [phase, context.lastOutcome] },
  )

  // Til brettet: spørsmålet kollapser tilbake til (brukt) rute.
  function handleReturnToBoard() {
    if (exitingRef.current) return
    exitingRef.current = true
    audioEngine.fadeOutAndStop(400)
    const el = stageRef.current
    const from = sceneBus.lastTileRect
    const finish = () => send({ type: 'RETURN_TO_BOARD' })
    if (!el || !from) {
      finish()
      return
    }
    const target = el.getBoundingClientRect()
    const tl = gsap.timeline({ onComplete: finish })
    tl.to(el, {
      x: from.left - target.left,
      y: from.top - target.top,
      scaleX: from.width / target.width,
      scaleY: from.height / target.height,
      opacity: 0.15,
      transformOrigin: '0 0',
      duration: dur(0.45),
      ease: 'power3.inOut',
    })
    const unregister = sceneBus.registerSkippable(() => tl.progress(1))
    tl.eventCallback('onComplete', () => {
      unregister()
      finish()
    })
    if (document.hidden) tl.progress(1)
  }

  useEffect(() => {
    return () => {
      audioEngine.unload()
    }
  }, [])

  if (!clue || !category) return null

  const phaseLabel =
    phase === 'presenting'
      ? 'Gjør klar …'
      : phase === 'active'
        ? `Svarfase — ${chooserTeam?.name ?? ''}`
        : phase === 'open'
          ? 'Åpen svarfase — verten spør lagene'
          : context.lastOutcome?.kind === 'award'
            ? 'Poeng delt ut'
            : 'Ingen fikk riktig'

  const showMediaError = Boolean(context.mediaError) && phase === 'presenting'
  const awardOutcome = context.lastOutcome?.kind === 'award' ? context.lastOutcome : null
  const awardedTeam = awardOutcome
    ? (context.teams.find((t) => t.id === awardOutcome.teamId) ?? null)
    : null

  return (
    <div ref={stageRef} className={styles.stage} data-phase={phase}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.category}>{category.title}</span>
          <span className={styles.value}>{clue.value}</span>
        </div>
        <span className={styles.typeBadge}>
          <TypeIcon type={clue.type} size={15} />
          {TYPE_LABELS[clue.type]}
        </span>
      </div>

      <div className={styles.phaseBanner} data-phase={phase}>
        {phaseLabel}
      </div>

      <div className={styles.body}>
        <div ref={flashRef} className={styles.expiredFlash} />

        {showMediaError ? (
          <div className={styles.errorPanel}>
            <span>{context.mediaError}</span>
            <div className={styles.errorActions}>
              <button
                type="button"
                className="stageButton stageButton--small"
                onClick={() => {
                  send({ type: 'RETRY_MEDIA' })
                  if (clue.media.kind === 'audio') audioEngine.retry()
                  else setImageAttempt((n) => n + 1)
                }}
              >
                Prøv igjen
              </button>
              <button
                type="button"
                className="stageButton stageButton--ghost stageButton--small"
                onClick={() => send({ type: 'SKIP_MEDIA' })}
              >
                Hopp til svarfase
              </button>
            </div>
          </div>
        ) : phase === 'presenting' ? (
          <div className={styles.loadingPanel}>
            <div className={styles.spinner} />
            <span>{clue.media.kind === 'audio' ? 'Laster lyd …' : 'Laster bilde …'}</span>
          </div>
        ) : clue.media.kind === 'image' ? (
          <div className={styles.mediaColumn}>
            <ImageStage
              src={imageFallback ? '/media/images/placeholder-clue.svg' : clue.media.src}
              hidden={context.mediaHidden}
            />
          </div>
        ) : (
          <div className={styles.audioStage}>
            <Visualizer playing={audioState.status === 'playing'} />
            {clue.type === 'ai-song' && clue.language && phase !== 'decided' && (
              <span className={styles.languageHint}>Hint: språket er {clue.language}</span>
            )}
          </div>
        )}

        {phase !== 'presenting' && (
          <div className={styles.timerSlot}>
            <Countdown />
          </div>
        )}
      </div>

      {phase === 'decided' && (
        <div className={styles.outcomeBanner}>
          {awardOutcome ? (
            <span className={styles.outcomeTitle}>
              +{awardOutcome.value} til {awardedTeam?.name}
            </span>
          ) : (
            <span className={`${styles.outcomeTitle} ${styles.outcomeTitleNone}`}>
              Ingen poeng denne runden
            </span>
          )}
        </div>
      )}

      {context.revealed && <AnswerReveal clue={clue} />}

      {phase === 'decided' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button type="button" className="stageButton" onClick={handleReturnToBoard}>
            Til brettet
          </button>
        </div>
      )}

      <div ref={chipRef} className={styles.awardChip} style={{ opacity: 0 }}>
        +{clue.value}
      </div>
    </div>
  )
}

function ImageStage({ src, hidden }: { src: string; hidden: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null)

  // Kontrollert, filmatisk reveal med maske.
  useGSAP(
    () => {
      if (!frameRef.current) return
      gsap.fromTo(
        frameRef.current,
        { clipPath: 'circle(0% at 50% 50%)', filter: 'brightness(2.2)' },
        {
          clipPath: 'circle(75% at 50% 50%)',
          filter: 'brightness(1)',
          duration: dur(0.9),
          ease: 'power2.out',
        },
      )
    },
    { scope: frameRef, dependencies: [src] },
  )

  return (
    <div ref={frameRef} className={styles.imageFrame}>
      <img className={styles.clueImage} src={src} alt="" draggable={false} />
      {hidden && <div className={styles.curtain}>SKJULT</div>}
    </div>
  )
}
