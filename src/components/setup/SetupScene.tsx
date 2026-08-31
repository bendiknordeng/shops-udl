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
import { canStartGame } from '../../game/game-machine'
import { getParticipant } from '../../game/selectors'
import { Avatar, preloadAvatars } from '../common/Avatar'
import styles from './setup.module.css'

export function SetupScene() {
  const { pack, actorRef, send } = useGame()
  const context = useSelector(actorRef, (s) => s.context)
  const [avatarsReady, setAvatarsReady] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const teamsDrawn = context.teams.length > 0
  const manual = pack.manualTeams !== null

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

  // Avatarer «stokkes fysisk» inn i lagene ved trekning.
  useGSAP(
    () => {
      if (!teamsDrawn) return
      gsap.from('[data-anim="team-card"]', {
        y: 30,
        opacity: 0,
        stagger: dur(0.1),
        duration: dur(0.45),
        ease: 'power2.out',
      })
      gsap.from('[data-anim="member"]', {
        x: () => gsap.utils.random(-160, 160),
        y: () => gsap.utils.random(-90, -30),
        rotation: () => gsap.utils.random(-40, 40),
        opacity: 0,
        stagger: { each: dur(0.04), from: 'random' },
        duration: dur(0.6),
        ease: 'back.out(1.4)',
        delay: dur(0.15),
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
    () => expectedTeamSizes(pack.participants.length, context.teamCount),
    [pack.participants.length, context.teamCount],
  )
  const uneven = new Set(sizes).size > 1

  function handleDraw() {
    const teams = allocateRandomTeams(pack.participants, context.teamCount)
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
        SHOPS <span className={styles.titleAccent}>UDL</span> QUIZ
      </h1>
      <p className={styles.intro} data-anim="intro">
        Jeopardy for utdrikningslaget til Anders «Shops» Vandvik. Velg antall lag, trekk
        deltakerne og la scenen gjøre resten.
      </p>

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
          <span className={styles.controlLabel}>Svartid</span>
          <div className={styles.sliderWrap}>
            <input
              type="range"
              className={styles.slider}
              min={pack.presentation.minAnswerSeconds}
              max={pack.presentation.maxAnswerSeconds}
              step={pack.presentation.answerSecondsStep}
              value={context.answerSeconds}
              onChange={(e) => send({ type: 'SET_ANSWER_SECONDS', seconds: Number(e.target.value) })}
              aria-label="Svartid i sekunder"
            />
            <span className={styles.sliderValue}>{context.answerSeconds} s</span>
          </div>
        </div>
      </div>

      {!teamsDrawn ? (
        <div className={styles.pool} data-anim="controls">
          {pack.participants.map((p) => (
            <div key={p.id} className={styles.poolItem}>
              <Avatar participant={p} size={52} />
              {p.name}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.teamsGrid}>
          {context.teams.map((team, index) => (
            <div key={team.id} className={styles.teamCard} data-anim="team-card">
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
                    <span key={pid} className={styles.memberChip} data-anim="member">
                      <Avatar participant={participant} size={26} />
                      {participant.name}
                    </span>
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
    </div>
  )
}
