/**
 * Build-tid-validering av spillpakken. Kjøres av `pnpm validate` og som første
 * steg i `pnpm build` — en ugyldig pakke blokkerer deploy (STACK.md).
 *
 * Kjøres direkte med Node (type stripping): node scripts/validate-pack.ts
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gamePackDefinition } from '../src/content/game-pack.ts'
import { GamePackSchema } from '../src/content/schemas.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function readJson(relPath: string): unknown {
  return JSON.parse(readFileSync(join(root, relPath), 'utf8'))
}

const participants = readJson('src/content/participants.json')
const teamNames = readJson('src/content/team-names.json')

const result = GamePackSchema.safeParse({
  ...gamePackDefinition,
  participants,
  teamNames,
})

if (!result.success) {
  console.error('❌ Spillpakken er ugyldig:\n')
  for (const issue of result.error.issues) {
    const path = issue.path.length ? `${issue.path.join('.')}: ` : ''
    console.error(`  - ${path}${issue.message}`)
  }
  process.exit(1)
}

const pack = result.data

// Alle refererte mediefiler må finnes lokalt i public/.
const missing: string[] = []
const checkedPaths = new Set<string>()

function checkAsset(publicPath: string, label: string, required: boolean) {
  if (checkedPaths.has(publicPath + label)) return
  checkedPaths.add(publicPath + label)
  const fsPath = join(root, 'public', publicPath.replace(/^\//, ''))
  if (!existsSync(fsPath)) {
    if (required) missing.push(`${label}: ${publicPath}`)
    else console.warn(`  ⚠ mangler (fallback brukes): ${label} → ${publicPath}`)
  }
}

for (const clue of pack.clues) {
  checkAsset(clue.media.src, `rute ${clue.id}`, true)
}
// Avatarer er valgfrie — appen har initial-fallback per deltaker.
for (const participant of pack.participants) {
  if (participant.avatar) checkAsset(participant.avatar, `avatar ${participant.id}`, false)
}

if (missing.length > 0) {
  console.error('❌ Refererte mediefiler mangler:\n')
  for (const m of missing) console.error(`  - ${m}`)
  process.exit(1)
}

console.log(
  `✅ Spillpakke OK: ${pack.categories.length} kategorier, ${pack.clues.length} ruter, ` +
    `${pack.participants.length} deltakere, ${pack.teamNames.length} lagnavn` +
    (pack.manualTeams ? `, manuelle lag (${pack.manualTeams.length})` : ', tilfeldig lagtrekning'),
)
