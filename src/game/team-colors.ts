import type { CSSProperties } from 'react'

const TEAM_COLORS = [
  { color: '#ff4f91', rgb: '255 79 145', contrast: '#16040c' },
  { color: '#35e0ff', rgb: '53 224 255', contrast: '#031216' },
  { color: '#9dff5c', rgb: '157 255 92', contrast: '#071304' },
  { color: '#ffad42', rgb: '255 173 66', contrast: '#170d02' },
  { color: '#aa8dff', rgb: '170 141 255', contrast: '#0d0718' },
  { color: '#ff625f', rgb: '255 98 95', contrast: '#180504' },
] as const

type TeamColorStyle = CSSProperties & {
  '--team-color': string
  '--team-color-rgb': string
  '--team-contrast': string
}

export function teamColorStyle(teamIndex: number): TeamColorStyle {
  const normalizedIndex = Math.max(0, teamIndex) % TEAM_COLORS.length
  const color = TEAM_COLORS[normalizedIndex]

  return {
    '--team-color': color.color,
    '--team-color-rgb': color.rgb,
    '--team-contrast': color.contrast,
  }
}
