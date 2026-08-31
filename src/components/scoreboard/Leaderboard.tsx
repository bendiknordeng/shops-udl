import { useSelector } from '@xstate/react'
import { useGame } from '../../app/GameProvider'
import { getParticipant } from '../../game/selectors'
import { Avatar } from '../common/Avatar'
import { ScoreOdometer } from './ScoreOdometer'
import styles from './scoreboard.module.css'

/**
 * Vedvarende leaderboard — synlig gjennom hele den aktive spillopplevelsen,
 * også når et spørsmål er åpent (GAME_SPEC §7.1).
 */
export function Leaderboard() {
  const { pack, actorRef } = useGame()
  const teams = useSelector(actorRef, (s) => s.context.teams)
  const activeTeamIndex = useSelector(actorRef, (s) => s.context.activeTeamIndex)

  return (
    <aside className={styles.leaderboard} aria-label="Poengoversikt">
      <span className={styles.heading}>Lag</span>
      {teams.map((team, index) => {
        const isActive = index === activeTeamIndex
        return (
          <div
            key={team.id}
            className={`${styles.teamCard} ${isActive ? styles.teamCardActive : ''}`}
            data-team-card={team.id}
          >
            <div className={styles.topRow}>
              <span className={styles.teamName}>{team.name}</span>
              {isActive && <span className={styles.turnBadge}>Tur</span>}
            </div>
            <div className={styles.bottomRow}>
              <span className={styles.avatars}>
                {team.participantIds.map((pid) => {
                  const participant = getParticipant(pack, pid)
                  if (!participant) return null
                  return <Avatar key={pid} participant={participant} size={26} />
                })}
              </span>
              <ScoreOdometer value={team.score} />
            </div>
          </div>
        )
      })}
    </aside>
  )
}
