import { z } from 'zod'

export const CLUE_VALUES = [100, 200, 300, 400, 500] as const
export type ClueValue = (typeof CLUE_VALUES)[number]

export const CLUE_TYPES = ['image', 'ai-song', 'song'] as const
export type ClueType = (typeof CLUE_TYPES)[number]

export const ParticipantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  avatar: z.string().min(1),
  // Intern kommentar — vises aldri i spillet.
  note: z.string().optional(),
})
export type Participant = z.infer<typeof ParticipantSchema>

export const ParticipantsSchema = z
  .array(ParticipantSchema)
  .min(2)
  .superRefine((list, ctx) => {
    const seen = new Set<string>()
    for (const p of list) {
      if (seen.has(p.id)) {
        ctx.addIssue({ code: 'custom', message: `Duplisert deltaker-ID: ${p.id}` })
      }
      seen.add(p.id)
    }
  })

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('nb-NO')

export const TeamNameBankSchema = z
  .array(z.string())
  .superRefine((names, ctx) => {
    const seen = new Set<string>()
    for (const raw of names) {
      const norm = normalizeName(raw)
      if (norm.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Navnebanken inneholder et tomt navn' })
        continue
      }
      if (raw.length > 32) {
        ctx.addIssue({ code: 'custom', message: `For langt lagnavn for leaderboardet: «${raw}»` })
      }
      if (seen.has(norm)) {
        ctx.addIssue({ code: 'custom', message: `Duplisert lagnavn etter normalisering: «${raw}»` })
      }
      seen.add(norm)
    }
  })

export const ImageMediaSchema = z.object({
  kind: z.literal('image'),
  src: z.string().min(1),
  // Intern beskrivelse for verten — må ikke avsløre svaret.
  hostDescription: z.string().optional(),
})
export type ImageMedia = z.infer<typeof ImageMediaSchema>

export const AudioMediaSchema = z.object({
  kind: z.literal('audio'),
  src: z.string().min(1),
  startAtSeconds: z.number().min(0).default(0),
  endAtSeconds: z.number().positive().optional(),
  fadeInMs: z.number().min(0).default(0),
  fadeOutMs: z.number().min(0).default(0),
  // Anbefalt volumjustering relativt til mastervolum (0–1).
  volume: z.number().min(0).max(1).default(1),
})
export type AudioMedia = z.infer<typeof AudioMediaSchema>

export const ClueMediaSchema = z.discriminatedUnion('kind', [ImageMediaSchema, AudioMediaSchema])
export type ClueMedia = z.infer<typeof ClueMediaSchema>

export const ClueSchema = z
  .object({
    id: z.string().min(1),
    categoryId: z.string().min(1),
    value: z.union([z.literal(100), z.literal(200), z.literal(300), z.literal(400), z.literal(500)]),
    type: z.enum(CLUE_TYPES),
    answer: z.string().min(1),
    acceptedAnswers: z.array(z.string().min(1)).default([]),
    explanation: z.string().optional(),
    // Kun for 'ai-song': språket teksten er oversatt til. Vises bare som valgfritt hint.
    language: z.string().optional(),
    // Kun for fasit på 'song'/'ai-song' — vises aldri før verten avslører.
    revealTitle: z.string().optional(),
    revealArtist: z.string().optional(),
    bonusInfo: z.string().optional(),
    media: ClueMediaSchema,
  })
  .superRefine((clue, ctx) => {
    const expected = clue.type === 'image' ? 'image' : 'audio'
    if (clue.media.kind !== expected) {
      ctx.addIssue({
        code: 'custom',
        message: `Rute ${clue.id}: type «${clue.type}» krever media av type «${expected}»`,
      })
    }
    if (
      clue.media.kind === 'audio' &&
      clue.media.endAtSeconds !== undefined &&
      clue.media.endAtSeconds <= clue.media.startAtSeconds
    ) {
      ctx.addIssue({ code: 'custom', message: `Rute ${clue.id}: endAtSeconds må være etter startAtSeconds` })
    }
  })
export type Clue = z.infer<typeof ClueSchema>

export const CategorySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(32),
})
export type Category = z.infer<typeof CategorySchema>

export const ManualTeamSchema = z.object({
  // Valgfritt fast lagnavn; utelates → navn trekkes fra navnebanken.
  name: z.string().min(1).max(32).optional(),
  participantIds: z.array(z.string().min(1)).min(1),
})
export type ManualTeam = z.infer<typeof ManualTeamSchema>

export const PresentationConfigSchema = z.object({
  minAnswerSeconds: z.number().int().positive(),
  maxAnswerSeconds: z.number().int().positive(),
  answerSecondsStep: z.number().int().positive(),
})
export type PresentationConfig = z.infer<typeof PresentationConfigSchema>

export const RulesConfigSchema = z.object({
  // Fast rundgang: valgtur går videre til neste lag etter hver rute (GAME_SPEC §8.5).
  turnRotation: z.literal('round-robin'),
  // Foreløpig ingen minuspoeng (GAME_SPEC §8.4).
  wrongAnswerPenalty: z.literal(false),
  maxUndoDepth: z.number().int().min(1).max(100),
})
export type RulesConfig = z.infer<typeof RulesConfigSchema>

export const GamePackSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    title: z.string().min(1),
    participants: ParticipantsSchema,
    allowedTeamCounts: z.array(z.number().int().min(2)).min(1),
    defaultAnswerSeconds: z.number().int().positive(),
    teamNames: TeamNameBankSchema,
    categories: z.array(CategorySchema).min(1),
    clues: z.array(ClueSchema).min(1),
    manualTeams: z.array(ManualTeamSchema).min(2).nullable(),
    presentation: PresentationConfigSchema,
    rules: RulesConfigSchema,
  })
  .superRefine((pack, ctx) => {
    const categoryIds = new Set(pack.categories.map((c) => c.id))
    if (categoryIds.size !== pack.categories.length) {
      ctx.addIssue({ code: 'custom', message: 'Dupliserte kategori-IDer' })
    }
    const clueIds = new Set<string>()
    const cells = new Set<string>()
    for (const clue of pack.clues) {
      if (clueIds.has(clue.id)) {
        ctx.addIssue({ code: 'custom', message: `Duplisert rute-ID: ${clue.id}` })
      }
      clueIds.add(clue.id)
      if (!categoryIds.has(clue.categoryId)) {
        ctx.addIssue({ code: 'custom', message: `Rute ${clue.id} peker på ukjent kategori «${clue.categoryId}»` })
      }
      const cell = `${clue.categoryId}::${clue.value}`
      if (cells.has(cell)) {
        ctx.addIssue({ code: 'custom', message: `Flere ruter på samme kategori/poeng: ${cell}` })
      }
      cells.add(cell)
    }
    const maxTeams = Math.max(...pack.allowedTeamCounts)
    if (pack.teamNames.length < maxTeams) {
      ctx.addIssue({ code: 'custom', message: 'Navnebanken har færre navn enn maksimalt antall lag' })
    }
    if (maxTeams > pack.participants.length) {
      ctx.addIssue({ code: 'custom', message: 'Flere lag enn deltakere er ikke mulig' })
    }
    if (
      pack.defaultAnswerSeconds < pack.presentation.minAnswerSeconds ||
      pack.defaultAnswerSeconds > pack.presentation.maxAnswerSeconds
    ) {
      ctx.addIssue({ code: 'custom', message: 'defaultAnswerSeconds er utenfor [min, max]' })
    }
    if (pack.manualTeams) {
      const participantIds = new Set(pack.participants.map((p) => p.id))
      const assigned = new Set<string>()
      for (const team of pack.manualTeams) {
        for (const pid of team.participantIds) {
          if (!participantIds.has(pid)) {
            ctx.addIssue({ code: 'custom', message: `manualTeams: ukjent deltaker-ID «${pid}»` })
          }
          if (assigned.has(pid)) {
            ctx.addIssue({ code: 'custom', message: `manualTeams: «${pid}» er plassert på flere lag` })
          }
          assigned.add(pid)
        }
      }
      for (const pid of participantIds) {
        if (!assigned.has(pid)) {
          ctx.addIssue({ code: 'custom', message: `manualTeams: «${pid}» er ikke plassert på noe lag` })
        }
      }
      const manualNames = pack.manualTeams
        .map((t) => t.name)
        .filter((n): n is string => Boolean(n))
        .map(normalizeName)
      if (new Set(manualNames).size !== manualNames.length) {
        ctx.addIssue({ code: 'custom', message: 'manualTeams: dupliserte lagnavn' })
      }
    }
  })
export type GamePack = z.infer<typeof GamePackSchema>

// Input-form (før zod-defaults er anvendt) — brukes av game-pack.ts for å få
// compile-time-sjekk under forfatting.
export type GamePackInput = z.input<typeof GamePackSchema>
