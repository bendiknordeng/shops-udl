import { useState } from 'react'
import type { GamePack, Participant } from '../../content/schemas'
import styles from './common.module.css'

const FALLBACK_HUES = [28, 340, 190, 96, 260, 14, 210, 320, 48, 160]

function hueFor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return FALLBACK_HUES[Math.abs(hash) % FALLBACK_HUES.length]
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type Props = {
  participant: Participant
  size?: number
  title?: string
}

/**
 * Deltakeravatar. Mangler webp-filen (plassholder-tilstand) rendres et
 * deterministisk farget initial-merke i stedet — spillet er alltid spillbart.
 */
export function Avatar({ participant, size = 40, title }: Props) {
  const [failed, setFailed] = useState(false)
  const hue = hueFor(participant.id)
  const showFallback = failed || !participant.avatar
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size }}
      title={title ?? participant.name}
      data-participant-id={participant.id}
    >
      {showFallback ? (
        <span
          className={styles.avatarFallback}
          style={{
            background: `linear-gradient(160deg, hsl(${hue} 90% 62%), hsl(${hue} 85% 42%))`,
            fontSize: size * 0.42,
          }}
        >
          {initialsFor(participant.name)}
        </span>
      ) : (
        <img
          className={styles.avatarImage}
          src={participant.avatar}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}

/**
 * Forsøker å laste alle avatarer før spillstart. Resolves alltid — filer som
 * mangler får fallback i <Avatar>, så dette er kun en "lastet eller fallback"-gate.
 */
export function preloadAvatars(pack: GamePack): Promise<void> {
  const loads = pack.participants.map(
    (p) =>
      new Promise<void>((resolve) => {
        if (!p.avatar) {
          resolve()
          return
        }
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = p.avatar
      }),
  )
  return Promise.all(loads).then(() => undefined)
}
