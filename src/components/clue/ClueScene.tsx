import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from '@xstate/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useGame } from '../../app/GameProvider'
import { sceneBus } from '../../app/scene-bus'
import { dur } from '../../app/motion'
import { audioEngine, type AudioEngineState } from '../../audio/audio-engine'
import { getCategory, getClue } from '../../game/selectors'
import { teamColorStyle } from '../../game/team-colors'
import { TypeIcon, TYPE_LABELS } from '../common/TypeIcon'
import { AnswerWindowCountdown, Countdown } from '../timer/Countdown'
import { Visualizer } from './Visualizer'
import { PlaybackProgress } from './PlaybackProgress'
import { AnswerReveal } from './AnswerReveal'
import styles from './clue.module.css'

type CluePhase = 'presenting' | 'ready' | 'active' | 'answerDelay' | 'open' | 'decided' | 'review'

export function ClueScene() {
  const { pack, actorRef, send } = useGame()
  const snapshot = useSelector(actorRef, (s) => s)
  const context = snapshot.context
  const clue = getClue(pack, context.activeClueId)
  const category = getCategory(pack, clue?.categoryId ?? null)

  let phase: CluePhase = 'decided'
  if (snapshot.matches({ clue: 'presenting' })) phase = 'presenting'
  else if (snapshot.matches({ clue: 'ready' })) phase = 'ready'
  else if (snapshot.matches({ clue: 'active' })) phase = 'active'
  else if (snapshot.matches({ clue: 'answerDelay' })) phase = 'answerDelay'
  else if (snapshot.matches({ clue: 'open' })) phase = 'open'
  else if (snapshot.matches({ clue: 'review' })) phase = 'review'

  const stageRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const countdownFlashRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const [entranceDone, setEntranceDone] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [audioState, setAudioState] = useState<AudioEngineState>(audioEngine.getState())
  const [imageAttempt, setImageAttempt] = useState(0)
  const [imageFallback, setImageFallback] = useState(false)
  // Fasiten holdes montert til utgangsanimasjonen er ferdig.
  const [revealMounted, setRevealMounted] = useState(context.revealed)
  const audioStartedRef = useRef(false)
  const previousAudioStatusRef = useRef(audioEngine.getState().status)
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
      const previousStatus = previousAudioStatusRef.current
      previousAudioStatusRef.current = state.status
      setAudioState(state)
      if (state.status === 'ready') setMediaReady(true)
      if (state.status === 'error' && state.error) {
        send({ type: 'MEDIA_FAILED', message: state.error })
      }
      const current = actorRef.getSnapshot()
      if (current.matches({ clue: 'active' })) {
        if (previousStatus === 'playing' && state.status === 'paused' && current.context.timer.status === 'running') {
          send({ type: 'PAUSE_COUNTDOWN' })
        }
        if (previousStatus === 'paused' && state.status === 'playing' && current.context.timer.status === 'paused') {
          send({ type: 'RESUME_COUNTDOWN' })
        }
      }
    })
    return unsubscribe
  }, [actorRef, send])

  // Svarfasen starter når presentasjonen er klar (entré + media).
  useEffect(() => {
    if (phase === 'presenting' && entranceDone && mediaReady && !context.mediaError) {
      send({ type: 'PRESENTATION_READY' })
    }
  }, [phase, entranceDone, mediaReady, context.mediaError, send])

  // Lyd og nedtelling starter koordinert. Brukt-ruter spiller fra start uten timer.
  useEffect(() => {
    if (
      (phase === 'active' || phase === 'review') &&
      clue?.media.kind === 'audio' &&
      !audioStartedRef.current
    ) {
      if (audioState.status === 'ready' || audioState.status === 'paused') {
        audioStartedRef.current = true
        if (phase === 'review') audioEngine.restart()
        else audioEngine.play()
      }
    }
  }, [phase, clue, audioState.status])

  // Utløpt svartid fryser sangen på gjeldende posisjon.
  useEffect(() => {
    if (
      (phase === 'answerDelay' || phase === 'open') &&
      context.timer.status === 'expired' &&
      clue?.media.kind === 'audio'
    ) {
      audioEngine.pause()
    }
  }, [phase, context.timer.status, clue])

  // Tidsutløp: scenen fryser tydelig uten å skjule media.
  useGSAP(
    () => {
      if (phase === 'answerDelay' && context.timer.status === 'expired' && flashRef.current) {
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
    const finish = () => {
      if (phase === 'review') send({ type: 'CLOSE_CLUE_REVIEW' })
      else send({ type: 'RETURN_TO_BOARD' })
    }
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
    if (context.revealed) setRevealMounted(true)
  }, [context.revealed])

  useEffect(() => {
    return () => {
      audioEngine.unload()
    }
  }, [])

  const flashFinalSecond = useCallback(() => {
    const element = countdownFlashRef.current
    if (!element) return
    gsap.killTweensOf(element)
    gsap.fromTo(
      element,
      { opacity: 0.62 },
      { opacity: 0, duration: dur(0.58), ease: 'power2.out' },
    )
  }, [])

  if (!clue || !category) return null

  const reviewResult = context.clueResults?.[clue.id]
  let reviewOutcome = 'Ingen poengtildeling registrert'
  if (reviewResult?.kind === 'none') reviewOutcome = 'Ingen fikk poeng'
  if (reviewResult?.kind === 'award') {
    const team = context.teams.find((candidate) => candidate.id === reviewResult.teamId)
    reviewOutcome = team
      ? `${team.name} fikk ${clue.value} poeng`
      : `${clue.value} poeng ble delt ut`
  }

  let phaseLabel = 'Ingen fikk riktig'
  if (phase === 'presenting') phaseLabel = 'Gjør klar …'
  else if (phase === 'ready') phaseLabel = ''
  else if (phase === 'active') phaseLabel = `Svarfase — ${chooserTeam?.name ?? ''}`
  else if (phase === 'answerDelay') phaseLabel = ''
  else if (phase === 'open') phaseLabel = ''
  else if (phase === 'review') phaseLabel = `Fasit: ${clue.answer} · ${reviewOutcome}`
  else if (context.lastOutcome?.kind === 'award') phaseLabel = 'Poeng delt ut'

  const showMediaError =
    Boolean(context.mediaError) && (phase === 'presenting' || phase === 'review')
  const awardOutcome = context.lastOutcome?.kind === 'award' ? context.lastOutcome : null
  const awardedTeam = awardOutcome
    ? (context.teams.find((t) => t.id === awardOutcome.teamId) ?? null)
    : null
  const awardedTeamIndex = awardedTeam
    ? context.teams.findIndex((team) => team.id === awardedTeam.id)
    : -1
  const awardedTeamStyle = awardedTeam ? teamColorStyle(awardedTeamIndex) : undefined

  let mediaContent = (
    <div className={styles.audioStage}>
      <Visualizer playing={audioState.status === 'playing'} />
      <PlaybackProgress />
      {clue.type === 'ai-song' && clue.language && phase !== 'decided' && (
        <span className={styles.languageHint}>Hint: språket er {clue.language}</span>
      )}
    </div>
  )

  if (showMediaError) {
    mediaContent = (
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
          {phase === 'presenting' && (
            <button
              type="button"
              className="stageButton stageButton--ghost stageButton--small"
              onClick={() => send({ type: 'SKIP_MEDIA' })}
            >
              Hopp til svarfase
            </button>
          )}
        </div>
      </div>
    )
  } else if (phase === 'presenting' || (phase === 'review' && !mediaReady)) {
    mediaContent = (
      <div className={styles.loadingPanel}>
        <div className={styles.spinner} />
        <span>{clue.media.kind === 'audio' ? 'Laster lyd …' : 'Laster bilde …'}</span>
      </div>
    )
  } else if (phase === 'ready') {
    mediaContent = (
      <div className={styles.readyPanel}>
        <span className={styles.readyIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M13.2 2.8 5.9 13h5.4l-.5 8.2L18.1 11h-5.4l.5-8.2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={styles.readyTitle}>Gjør dere klare</span>
      </div>
    )
  } else if (clue.media.kind === 'image') {
    mediaContent = (
      <div className={styles.mediaColumn}>
        <ImageStage
          src={imageFallback ? '/media/images/placeholder-clue.svg' : clue.media.src}
          hidden={context.mediaHidden}
        />
      </div>
    )
  }

  return (
    <div ref={stageRef} className={styles.stage} data-phase={phase}>
      <div ref={countdownFlashRef} className={styles.countdownFlash} aria-hidden="true" />
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

      {phaseLabel && (
        <div className={styles.phaseBanner} data-phase={phase}>
          {phaseLabel}
        </div>
      )}

      {phase === 'open' && context.answerWindowTimer?.status === 'running' && (
        <div className={styles.answerWindowRow}>
          <AnswerWindowCountdown />
        </div>
      )}

      <div className={styles.body}>
        <div ref={flashRef} className={styles.expiredFlash} />

        {mediaContent}

        {phase === 'active' && (
          <div className={styles.timerSlot}>
            <Countdown onFinalTick={flashFinalSecond} />
          </div>
        )}

      </div>

      {phase === 'decided' && (
        <div className={styles.outcomeBanner}>
          {awardOutcome ? (
            <span
              className={`${styles.outcomeTitle} ${styles.outcomeTitleAwarded}`}
              style={awardedTeamStyle}
            >
              +{awardOutcome.value} til {awardedTeam?.name}
            </span>
          ) : (
            <span className={`${styles.outcomeTitle} ${styles.outcomeTitleNone}`}>
              Ingen poeng denne runden
            </span>
          )}
        </div>
      )}

      {revealMounted && (
        <div className={styles.revealLayer}>
          <AnswerReveal
            clue={clue}
            visible={context.revealed}
            onHidden={() => setRevealMounted(false)}
          />
        </div>
      )}

      {(phase === 'decided' || phase === 'review') && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button type="button" className="stageButton" onClick={handleReturnToBoard}>
            Til brettet
          </button>
        </div>
      )}

      <div
        ref={chipRef}
        className={styles.awardChip}
        style={{ opacity: 0, ...awardedTeamStyle }}
      >
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
