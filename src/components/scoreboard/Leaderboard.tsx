import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from '@xstate/react'
import { useGame } from '../../app/GameProvider'
import { getParticipant, sortedByScore } from '../../game/selectors'
import { teamColorStyle } from '../../game/team-colors'
import { Avatar } from '../common/Avatar'
import { ScoreOdometer } from './ScoreOdometer'
import styles from './scoreboard.module.css'

/**
 * Vedvarende leaderboard — synlig gjennom hele den aktive spillopplevelsen,
 * også når et spørsmål er åpent (GAME_SPEC §7.1).
 */
export function Leaderboard() {
  const { pack, actorRef } = useGame()
  const [presentedTeamId, setPresentedTeamId] = useState<string | null>(null)
  const gameTeams = useSelector(actorRef, (s) => s.context.teams)
  const activeTeamIndex = useSelector(actorRef, (s) => s.context.activeTeamIndex)
  const activeTeamId = gameTeams[activeTeamIndex]?.id ?? null
  const teams = sortedByScore(gameTeams)
  const presentedTeam = teams.find((team) => team.id === presentedTeamId) ?? null
  const presentedRank = presentedTeam ? teams.findIndex((team) => team.id === presentedTeam.id) + 1 : 0
  const presentedTeamIndex = presentedTeam
    ? gameTeams.findIndex((team) => team.id === presentedTeam.id)
    : -1

  useEffect(() => {
    if (!presentedTeam) return
    function closeOnKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' && e.key !== 'x' && e.key !== 'X') return
      e.preventDefault()
      e.stopImmediatePropagation()
      setPresentedTeamId(null)
    }
    window.addEventListener('keydown', closeOnKey, true)
    return () => window.removeEventListener('keydown', closeOnKey, true)
  }, [presentedTeam])

  return (
    <>
      <aside className={styles.leaderboard} aria-label="Poengoversikt">
        <span className={styles.heading}>Lag</span>
        {teams.map((team, index) => {
          const isActive = team.id === activeTeamId
          const teamIndex = gameTeams.findIndex((gameTeam) => gameTeam.id === team.id)
          return (
            <button
              key={team.id}
              type="button"
              className={`${styles.teamCard} ${isActive ? styles.teamCardActive : ''}`}
              data-team-card={team.id}
              style={teamColorStyle(teamIndex)}
              onClick={() => setPresentedTeamId(team.id)}
              aria-label={`Vis deltakerne på ${team.name}`}
            >
              <span className={styles.topRow}>
                <span className={styles.rank}>#{index + 1}</span>
                <span className={styles.teamName}>{team.name}</span>
                {isActive && <span className={styles.turnBadge}>Deres tur</span>}
              </span>
              <span className={styles.bottomRow}>
                <span className={styles.avatars}>
                  {team.participantIds.map((pid) => {
                    const participant = getParticipant(pack, pid)
                    if (!participant) return null
                    return <Avatar key={pid} participant={participant} size={26} />
                  })}
                </span>
                <ScoreOdometer value={team.score} />
              </span>
            </button>
          )
        })}
      </aside>

      {presentedTeam &&
        createPortal(
          <div
            className={styles.presentationBackdrop}
            style={teamColorStyle(presentedTeamIndex)}
            role="presentation"
            onClick={() => setPresentedTeamId(null)}
          >
            <section
              className={styles.presentationCard}
              role="dialog"
              aria-modal="true"
              aria-label={`Deltakere på ${presentedTeam.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.presentationClose}
                onClick={() => setPresentedTeamId(null)}
                aria-label="Lukk lagvisning"
              >
                ×
              </button>
              <span className={styles.presentationRank}>#{presentedRank}</span>
              <h2 className={styles.presentationName}>{presentedTeam.name}</h2>
              <span className={styles.presentationScore}>{presentedTeam.score} poeng</span>
              <div className={styles.participantGrid}>
                {presentedTeam.participantIds.map((pid, index) => {
                  const participant = getParticipant(pack, pid)
                  if (!participant) return null
                  return (
                    <div
                      key={pid}
                      className={styles.participantCard}
                      style={{ '--participant-index': index } as React.CSSProperties}
                    >
                      <Avatar participant={participant} size={128} />
                      <strong>{participant.name}</strong>
                    </div>
                  )
                })}
              </div>
              <span className={styles.presentationHint}>X eller Esc for å lukke</span>
            </section>
          </div>,
          document.body,
        )}
    </>
  )
}
