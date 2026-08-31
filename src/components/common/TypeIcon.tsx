import type { ClueType } from '../../content/schemas'
import styles from './common.module.css'

type Props = {
  type: ClueType
  size?: number
}

/**
 * Egne SVG-ikoner per spørsmålstype — skilles med form, ikke bare farge
 * (GAME_SPEC §3.4).
 */
export function TypeIcon({ type, size = 18 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true as const,
  }
  return (
    <span className={styles.typeIcon} data-type={type}>
      {type === 'image' && (
        // Bilderamme med fjell/sol
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="9" cy="9.5" r="1.8" fill="currentColor" />
          <path d="M5 17.5l4.6-4.8 3.2 3.2 2.7-2.6 3.5 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {type === 'ai-song' && (
        // Bølgeform + gnist
        <svg {...common}>
          <path d="M3 12h1.5M6.5 8.5v7M10 5.5v13M13.5 8.5v7M17 10.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M20 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" fill="currentColor" />
        </svg>
      )}
      {type === 'song' && (
        // Vinylplate med note
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      )}
    </span>
  )
}

export const TYPE_LABELS: Record<ClueType, string> = {
  image: 'Bilde',
  'ai-song': 'AI-sang',
  song: 'Sang',
}

/** Kompakt tegnforklaring for brettet. */
export function TypeLegend() {
  return (
    <div className={styles.legend} aria-label="Spørsmålstyper">
      {(['image', 'ai-song', 'song'] as const).map((t) => (
        <span key={t} className={styles.legendItem}>
          <TypeIcon type={t} size={14} />
          {TYPE_LABELS[t]}
        </span>
      ))}
    </div>
  )
}
