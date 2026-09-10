import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from '@xstate/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useGame } from '../../app/GameProvider'
import { dur } from '../../app/motion'
import {
  allocateManualTeams,
  allocateRandomTeams,
  drawTeamNames,
  expectedTeamSizes,
} from '../../game/allocate-teams'
import {
  canStartGame,
  DEFAULT_ANSWER_WINDOW_SECONDS,
  MAX_ANSWER_WINDOW_SECONDS,
  MIN_ANSWER_WINDOW_SECONDS,
} from '../../game/game-machine'
import { getParticipant } from '../../game/selectors'
import { teamColorStyle } from '../../game/team-colors'
import { Avatar, preloadAvatars } from '../common/Avatar'
import styles from './setup.module.css'

const QUESTION_TYPE_TIME_CONTROLS = [
  { type: 'image', label: 'Bilde' },
  { type: 'ai-image', label: 'AI-bilde' },
  { type: 'ai-song', label: 'AI-sang' },
  { type: 'song', label: 'Sang' },
] as const

export function SetupScene() {
  const { pack, actorRef, send } = useGame()
  const context = useSelector(actorRef, (s) => s.context)
  const [avatarsReady, setAvatarsReady] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [spotlightParticipantId, setSpotlightParticipantId] = useState<string | null>(null)
  const [presentationTeamIndex, setPresentationTeamIndex] = useState<number | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const teamsDrawn = context.teams.length > 0
  const manual = pack.manualTeams !== null
  const teamParticipants = useMemo(
    () => pack.participants.filter((participant) => !participant.excludedFromTeams),
    [pack.participants],
  )
  const answerWindowSeconds = context.answerWindowSeconds ?? DEFAULT_ANSWER_WINDOW_SECONDS
  const answerSecondsByType = context.answerSecondsByType ?? {
    image: context.answerSeconds,
    'ai-image': context.answerSeconds,
    'ai-song': context.answerSeconds,
    song: context.answerSeconds,
  }
  const spotlightParticipant =
    spotlightParticipantId == null ? null : getParticipant(pack, spotlightParticipantId)
  const presentationTeam =
    presentationTeamIndex == null ? null : (context.teams[presentationTeamIndex] ?? null)

  // Alle avatarressurser lastet eller fallback — gate for «Start spillet».
  useEffect(() => {
    let active = true
    void preloadAvatars(pack).then(() => {
      if (active) setAvatarsReady(true)
    })
    return () => {
      active = false
    }
  }, [pack])

  // Manuelle lag fra spillpakken settes automatisk (default er random).
  useEffect(() => {
    if (manual && !teamsDrawn && pack.manualTeams) {
      const teams = allocateManualTeams(pack.manualTeams)
      send({ type: 'DRAW_TEAMS', teams, manual: true })
      send({ type: 'DRAW_TEAM_NAMES', names: drawTeamNames(pack, teams) })
    }
  }, [manual, teamsDrawn, pack, send])

  useEffect(() => {
    if (spotlightParticipantId == null && presentationTeamIndex == null) return

    function handleOverlayKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (spotlightParticipantId != null) {
        setSpotlightParticipantId(null)
        return
      }
      setPresentationTeamIndex(null)
    }

    window.addEventListener('keydown', handleOverlayKeyDown)
    return () => window.removeEventListener('keydown', handleOverlayKeyDown)
  }, [presentationTeamIndex, spotlightParticipantId])

  // Scenen bygges opp lagvis ved appstart.
  useGSAP(
    () => {
      gsap.from('[data-anim="title"]', { y: -40, opacity: 0, duration: dur(0.7), ease: 'power3.out' })
      gsap.from('[data-anim="intro"]', { opacity: 0, duration: dur(0.6), delay: dur(0.25) })
      gsap.from('[data-anim="controls"] > *', {
        y: 24,
        opacity: 0,
        stagger: dur(0.08),
        duration: dur(0.5),
        delay: dur(0.35),
        ease: 'power2.out',
      })
    },
    { scope: sceneRef },
  )

  // Lagene kommer rolig inn i sin endelige plass. Selve show-effekten ligger
  // i presentasjonsmodusen, så oppsettet er alltid lett å lese.
  useGSAP(
    () => {
      if (!teamsDrawn) return
      gsap.from('[data-anim="team-card"]', {
        y: 18,
        opacity: 0,
        stagger: dur(0.1),
        duration: dur(0.4),
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      })
      gsap.from('[data-anim="member"]', {
        y: 10,
        scale: 0.94,
        opacity: 0,
        stagger: dur(0.04),
        duration: dur(0.35),
        ease: 'power2.out',
        delay: dur(0.1),
        clearProps: 'transform,opacity',
      })
    },
    { scope: sceneRef, dependencies: [teamsDrawn, context.teams.map((t) => t.id).join('|')] },
  )

  // Lagnavn avsløres ett lag om gangen.
  const namesKey = context.teams.map((t) => t.name).join('|')
  useGSAP(
    () => {
      if (!teamsDrawn) return
      gsap.from('[data-anim="team-name"]', {
        opacity: 0,
        y: 10,
        scale: 0.95,
        stagger: dur(0.15),
        duration: dur(0.4),
        ease: 'power2.out',
      })
    },
    { scope: sceneRef, dependencies: [namesKey] },
  )

  const sizes = useMemo(
    () => expectedTeamSizes(teamParticipants.length, context.teamCount),
    [teamParticipants.length, context.teamCount],
  )
  const uneven = new Set(sizes).size > 1

  function handleDraw() {
    setPresentationTeamIndex(null)
    const teams = allocateRandomTeams(teamParticipants, context.teamCount)
    send({ type: 'DRAW_TEAMS', teams, manual: false })
    send({ type: 'DRAW_TEAM_NAMES', names: drawTeamNames(pack, teams) })
  }

  function commitName(teamId: string, raw: string) {
    const name = raw.trim()
    setEditingTeamId(null)
    if (name.length === 0) {
      setNameError('Lagnavn kan ikke være tomt')
      return
    }
    if (name.length > 32) {
      setNameError('Lagnavnet er for langt for leaderboardet')
      return
    }
    const clash = context.teams.some(
      (t) => t.id !== teamId && t.name.trim().toLocaleLowerCase('nb-NO') === name.toLocaleLowerCase('nb-NO'),
    )
    if (clash) {
      setNameError('To lag kan ikke ha samme navn')
      return
    }
    setNameError(null)
    send({ type: 'EDIT_TEAM_NAME', teamId, name })
  }

  const startReady = canStartGame(pack, context) && avatarsReady
  const startHint = !teamsDrawn
    ? 'Trekk lag for å komme i gang'
    : !avatarsReady
      ? 'Laster avatarer …'
      : !startReady
        ? 'Alle lag må ha unike navn'
        : 'Klart — lykke til!'

  return (
    <div ref={sceneRef} className={styles.scene}>
      <h1 className={styles.title} data-anim="title">
        AI&D Young <span className={styles.titleAccent}>Dyrkes</span>
      </h1>

      <div className={styles.controlsRow} data-anim="controls">
        {!manual && (
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>Antall lag</span>
            <div className={styles.countRow}>
              {pack.allowedTeamCounts.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`${styles.countButton} ${count === context.teamCount ? styles.countButtonActive : ''}`}
                  onClick={() => send({ type: 'SET_TEAM_COUNT', count })}
                >
                  {count}
                </button>
              ))}
            </div>
            <span className={styles.countHint}>
              {context.teamCount} lag · {sizes.join(' / ')} spillere
              {uneven ? ' (ulik fordeling)' : ''}
            </span>
          </div>
        )}

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Spørsmålstid</span>
          <div className={styles.sliderWrap}>
            <input
              type="range"
              className={styles.slider}
              min={pack.presentation.minAnswerSeconds}
              max={pack.presentation.maxAnswerSeconds}
              step={pack.presentation.answerSecondsStep}
              value={context.answerSeconds}
              onChange={(e) => send({ type: 'SET_ANSWER_SECONDS', seconds: Number(e.target.value) })}
              aria-label="Spørsmålstid i sekunder"
            />
            <span className={styles.sliderValue}>{context.answerSeconds} s</span>
          </div>
          <details className={styles.advancedTimeSettings}>
            <summary>Avanserte innstillinger</summary>
            <div className={styles.advancedTimeGrid}>
              {QUESTION_TYPE_TIME_CONTROLS.map(({ type, label }) => (
                <label key={type} className={styles.advancedTimeRow}>
                  <span>{label}</span>
                  <input
                    type="range"
                    className={styles.slider}
                    min={pack.presentation.minAnswerSeconds}
                    max={pack.presentation.maxAnswerSeconds}
                    step={pack.presentation.answerSecondsStep}
                    value={answerSecondsByType[type]}
                    onChange={(e) =>
                      send({
                        type: 'SET_CLUE_TYPE_ANSWER_SECONDS',
                        clueType: type,
                        seconds: Number(e.target.value),
                      })
                    }
                  />
                  <strong>{answerSecondsByType[type]} s</strong>
                </label>
              ))}
            </div>
          </details>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Tid til å avgi svar</span>
          <div className={styles.sliderWrap}>
            <input
              type="range"
              className={styles.slider}
              min={MIN_ANSWER_WINDOW_SECONDS}
              max={MAX_ANSWER_WINDOW_SECONDS}
              step={1}
              value={answerWindowSeconds}
              onChange={(e) =>
                send({ type: 'SET_ANSWER_WINDOW_SECONDS', seconds: Number(e.target.value) })
              }
              aria-label="Tid til å avgi svar i sekunder"
            />
            <span className={styles.sliderValue}>{answerWindowSeconds} s</span>
          </div>
        </div>
      </div>

      {!teamsDrawn ? (
        <div className={styles.pool} data-anim="controls">
          {pack.participants.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.poolItem} ${p.excludedFromTeams ? styles.poolItemExcluded : ''}`}
              aria-label={
                p.excludedFromTeams
                  ? `Vis stort bilde av ${p.name} – ikke med i lagtrekningen`
                  : `Vis stort bilde av ${p.name}`
              }
              onClick={() => setSpotlightParticipantId(p.id)}
            >
              <span className={styles.poolAvatar}>
                <Avatar participant={p} size={160} />
                {p.excludedFromTeams && <span className={styles.excludedMark} aria-hidden="true" />}
              </span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.teamsGrid}>
          {context.teams.map((team, index) => (
            <div
              key={team.id}
              className={styles.teamCard}
              data-anim="team-card"
              style={teamColorStyle(index)}
            >
              <span className={styles.teamOrder}>Tur {index + 1}</span>
              {editingTeamId === team.id ? (
                <input
                  className={styles.teamNameInput}
                  defaultValue={team.name}
                  autoFocus
                  maxLength={32}
                  onBlur={(e) => commitName(team.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitName(team.id, e.currentTarget.value)
                    if (e.key === 'Escape') setEditingTeamId(null)
                  }}
                />
              ) : (
                <div
                  className={styles.teamName}
                  data-anim="team-name"
                  title={team.nameLocked ? 'Fast navn fra spillpakken' : 'Klikk for å redigere'}
                  onClick={() => {
                    if (!team.nameLocked) setEditingTeamId(team.id)
                  }}
                >
                  {team.name || '…'}
                </div>
              )}
              <div className={styles.teamMembers}>
                {team.participantIds.map((pid) => {
                  const participant = getParticipant(pack, pid)
                  if (!participant) return null
                  return (
                    <button
                      key={pid}
                      type="button"
                      className={styles.memberCard}
                      data-anim="member"
                      aria-label={`Vis stort bilde av ${participant.name}`}
                      onClick={() => setSpotlightParticipantId(participant.id)}
                    >
                      <Avatar participant={participant} size={92} />
                      <span>{participant.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {nameError && <span className={styles.nameError}>{nameError}</span>}

      <div className={styles.actionsRow}>
        {!teamsDrawn ? (
          !manual && (
            <button type="button" className="stageButton" onClick={handleDraw}>
              Trekk lag
            </button>
          )
        ) : (
          <>
            <button
              type="button"
              className={`stageButton ${styles.presentationButton}`}
              onClick={() => setPresentationTeamIndex(0)}
            >
              ✦ Presenter lagene
            </button>
            {!manual && (
              <button type="button" className="stageButton stageButton--ghost" onClick={handleDraw}>
                Trekk lag på nytt
              </button>
            )}
            <button
              type="button"
              className="stageButton stageButton--ghost"
              onClick={() => send({ type: 'DRAW_TEAM_NAMES', names: drawTeamNames(pack, context.teams) })}
            >
              Nye lagnavn
            </button>
            {context.nameHistory.length > 0 && (
              <button
                type="button"
                className="stageButton stageButton--ghost"
                onClick={() => send({ type: 'RESTORE_PREVIOUS_NAMES' })}
              >
                Forrige navn
              </button>
            )}
            <button
              type="button"
              className="stageButton"
              disabled={!startReady}
              onClick={() => send({ type: 'START_GAME' })}
            >
              Start spillet
            </button>
          </>
        )}
      </div>
      <span className={styles.startHint}>{startHint}</span>

      {presentationTeam && presentationTeamIndex != null && (
        <div
          className={styles.presentationOverlay}
          style={teamColorStyle(presentationTeamIndex)}
          role="dialog"
          aria-modal="true"
          aria-label={`Presentasjon av ${presentationTeam.name}`}
        >
          <div className={styles.presentationLights} aria-hidden="true" />
          <button
            type="button"
            className={styles.overlayClose}
            aria-label="Lukk lagpresentasjonen"
            onClick={() => setPresentationTeamIndex(null)}
          >
            ✕
          </button>
          <div key={presentationTeam.id} className={styles.presentationStage}>
            <span className={styles.presentationKicker}>
              Lag {presentationTeamIndex + 1} av {context.teams.length}
            </span>
            <h2 className={styles.presentationTeamName}>{presentationTeam.name}</h2>
            <div className={styles.presentationMembers}>
              {presentationTeam.participantIds.map((participantId, memberIndex) => {
                const participant = getParticipant(pack, participantId)
                if (!participant) return null
                return (
                  <button
                    key={participant.id}
                    type="button"
                    className={styles.presentationMember}
                    style={{ animationDelay: `${memberIndex * 90}ms` }}
                    aria-label={`Vis stort bilde av ${participant.name}`}
                    onClick={() => setSpotlightParticipantId(participant.id)}
                  >
                    <Avatar participant={participant} size={112} />
                    <span>{participant.name}</span>
                  </button>
                )
              })}
            </div>
            <div className={styles.presentationFooter}>
              <button
                type="button"
                className="stageButton stageButton--ghost"
                disabled={presentationTeamIndex === 0}
                onClick={() => setPresentationTeamIndex((index) => Math.max(0, (index ?? 0) - 1))}
              >
                ← Forrige
              </button>
              <div className={styles.presentationProgress} aria-hidden="true">
                {context.teams.map((team, index) => (
                  <span
                    key={team.id}
                    className={`${styles.presentationDot} ${index === presentationTeamIndex ? styles.presentationDotActive : ''}`}
                    style={teamColorStyle(index)}
                  />
                ))}
              </div>
              {presentationTeamIndex < context.teams.length - 1 ? (
                <button
                  type="button"
                  className="stageButton"
                  onClick={() => setPresentationTeamIndex((index) => (index ?? 0) + 1)}
                >
                  Neste lag →
                </button>
              ) : (
                <button
                  type="button"
                  className="stageButton"
                  onClick={() => setPresentationTeamIndex(null)}
                >
                  Alle er klare
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {spotlightParticipant && (
        <div
          className={styles.avatarOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={spotlightParticipant.name}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSpotlightParticipantId(null)
          }}
        >
          <button
            type="button"
            className={styles.overlayClose}
            aria-label="Lukk stort bilde"
            onClick={() => setSpotlightParticipantId(null)}
          >
            ✕
          </button>
          <div className={styles.avatarSpotlightCard}>
            <div className={styles.avatarSpotlightGlow} aria-hidden="true" />
            <Avatar participant={spotlightParticipant} size={320} />
            <span className={styles.avatarSpotlightName}>{spotlightParticipant.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
