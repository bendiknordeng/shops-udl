import type { GamePackInput } from './schemas'

/**
 * Spillpakken for Shops UDL Quiz.
 *
 * ALT innhold her er PLASSHOLDERE og skal byttes ut før spillkvelden:
 *  - kategorier: sett ekte kategorinavn (navnedomener, f.eks. «Byer», «Artister»)
 *  - clues: sett ekte svar, aliaser, forklaring og media-referanser
 *  - bilder legges i  public/media/images/   (webp/jpg/svg)
 *  - sanger legges i  public/media/audio/    (mp3/m4a/wav) — nøytrale filnavn!
 *  - avatarer legges i public/media/participants/<deltaker-id>.webp
 *
 * Filnavn på media må ALDRI røpe svar, tittel eller artist.
 *
 * MANUELLE LAG (valgfritt):
 * Default er tilfeldig trekning. Vil du sette lagene selv, fyll inn
 * `manualTeams` nedenfor — da brukes de i stedet for trekning, og
 * «Trekk lag på nytt» skjules. Alle 17 deltaker-IDer må fordeles nøyaktig
 * én gang. `name` er valgfritt; utelates det trekkes navn fra navnebanken.
 *
 *   manualTeams: [
 *     { name: 'Lag 1', participantIds: ['shops', 'bendik-edvardsen', ...] },
 *     { participantIds: ['jon-wilberg', ...] },
 *   ],
 */

// Deltakere og navnebank ligger i participants.json / team-names.json og
// flettes inn i load-pack.ts (og av scripts/validate-pack.ts).
export type GamePackDefinition = Omit<GamePackInput, 'participants' | 'teamNames'>

export const gamePackDefinition: GamePackDefinition = {
  id: 'shops-udl-quiz',
  version: '1.0.0',
  title: 'Shops UDL Quiz',

  allowedTeamCounts: [2, 3, 4, 5, 6],
  defaultAnswerSeconds: 30,
  presentation: {
    minAnswerSeconds: 10,
    maxAnswerSeconds: 90,
    answerSecondsStep: 5,
  },
  rules: {
    turnRotation: 'round-robin',
    wrongAnswerPenalty: false,
    maxUndoDepth: 20,
  },

  // Default: tilfeldig trekning. Se doc-kommentar øverst for manuelt oppsett.
  manualTeams: null,

  categories: [
    { id: 'kategori-1', title: 'Kategori 1' },
    { id: 'kategori-2', title: 'Kategori 2' },
    { id: 'kategori-3', title: 'Kategori 3' },
    { id: 'kategori-4', title: 'Kategori 4' },
    { id: 'kategori-5', title: 'Kategori 5' },
  ],

  clues: [
    // ── Kategori 1 ─────────────────────────────────────────────
    {
      id: 'k1-100',
      categoryId: 'kategori-1',
      value: 100,
      type: 'image',
      answer: 'Placeholder-svar K1-100',
      acceptedAnswers: [],
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'image', src: '/media/images/placeholder-clue.svg' },
    },
    {
      id: 'k1-200',
      categoryId: 'kategori-1',
      value: 200,
      type: 'ai-song',
      answer: 'Placeholder-svar K1-200',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k1-300',
      categoryId: 'kategori-1',
      value: 300,
      type: 'song',
      answer: 'Placeholder-svar K1-300',
      acceptedAnswers: [],
      revealTitle: 'Plassholder-tittel',
      revealArtist: 'Plassholder-artist',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-song.wav', startAtSeconds: 0, fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k1-400',
      categoryId: 'kategori-1',
      value: 400,
      type: 'image',
      answer: 'Placeholder-svar K1-400',
      acceptedAnswers: [],
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'image', src: '/media/images/placeholder-clue.svg' },
    },
    {
      id: 'k1-500',
      categoryId: 'kategori-1',
      value: 500,
      type: 'ai-song',
      answer: 'Placeholder-svar K1-500',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },

    // ── Kategori 2 ─────────────────────────────────────────────
    {
      id: 'k2-100',
      categoryId: 'kategori-2',
      value: 100,
      type: 'ai-song',
      answer: 'Placeholder-svar K2-100',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k2-200',
      categoryId: 'kategori-2',
      value: 200,
      type: 'song',
      answer: 'Placeholder-svar K2-200',
      acceptedAnswers: [],
      revealTitle: 'Plassholder-tittel',
      revealArtist: 'Plassholder-artist',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-song.wav', startAtSeconds: 0, fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k2-300',
      categoryId: 'kategori-2',
      value: 300,
      type: 'image',
      answer: 'Placeholder-svar K2-300',
      acceptedAnswers: [],
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'image', src: '/media/images/placeholder-clue.svg' },
    },
    {
      id: 'k2-400',
      categoryId: 'kategori-2',
      value: 400,
      type: 'ai-song',
      answer: 'Placeholder-svar K2-400',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k2-500',
      categoryId: 'kategori-2',
      value: 500,
      type: 'song',
      answer: 'Placeholder-svar K2-500',
      acceptedAnswers: [],
      revealTitle: 'Plassholder-tittel',
      revealArtist: 'Plassholder-artist',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-song.wav', startAtSeconds: 0, fadeInMs: 300, fadeOutMs: 600 },
    },

    // ── Kategori 3 ─────────────────────────────────────────────
    {
      id: 'k3-100',
      categoryId: 'kategori-3',
      value: 100,
      type: 'song',
      answer: 'Placeholder-svar K3-100',
      acceptedAnswers: [],
      revealTitle: 'Plassholder-tittel',
      revealArtist: 'Plassholder-artist',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-song.wav', startAtSeconds: 0, fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k3-200',
      categoryId: 'kategori-3',
      value: 200,
      type: 'image',
      answer: 'Placeholder-svar K3-200',
      acceptedAnswers: [],
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'image', src: '/media/images/placeholder-clue.svg' },
    },
    {
      id: 'k3-300',
      categoryId: 'kategori-3',
      value: 300,
      type: 'ai-song',
      answer: 'Placeholder-svar K3-300',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k3-400',
      categoryId: 'kategori-3',
      value: 400,
      type: 'song',
      answer: 'Placeholder-svar K3-400',
      acceptedAnswers: [],
      revealTitle: 'Plassholder-tittel',
      revealArtist: 'Plassholder-artist',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-song.wav', startAtSeconds: 0, fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k3-500',
      categoryId: 'kategori-3',
      value: 500,
      type: 'image',
      answer: 'Placeholder-svar K3-500',
      acceptedAnswers: [],
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'image', src: '/media/images/placeholder-clue.svg' },
    },

    // ── Kategori 4 ─────────────────────────────────────────────
    {
      id: 'k4-100',
      categoryId: 'kategori-4',
      value: 100,
      type: 'image',
      answer: 'Placeholder-svar K4-100',
      acceptedAnswers: [],
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'image', src: '/media/images/placeholder-clue.svg' },
    },
    {
      id: 'k4-200',
      categoryId: 'kategori-4',
      value: 200,
      type: 'ai-song',
      answer: 'Placeholder-svar K4-200',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k4-300',
      categoryId: 'kategori-4',
      value: 300,
      type: 'song',
      answer: 'Placeholder-svar K4-300',
      acceptedAnswers: [],
      revealTitle: 'Plassholder-tittel',
      revealArtist: 'Plassholder-artist',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-song.wav', startAtSeconds: 0, fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k4-400',
      categoryId: 'kategori-4',
      value: 400,
      type: 'image',
      answer: 'Placeholder-svar K4-400',
      acceptedAnswers: [],
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'image', src: '/media/images/placeholder-clue.svg' },
    },
    {
      id: 'k4-500',
      categoryId: 'kategori-4',
      value: 500,
      type: 'ai-song',
      answer: 'Placeholder-svar K4-500',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },

    // ── Kategori 5 ─────────────────────────────────────────────
    {
      id: 'k5-100',
      categoryId: 'kategori-5',
      value: 100,
      type: 'ai-song',
      answer: 'Placeholder-svar K5-100',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k5-200',
      categoryId: 'kategori-5',
      value: 200,
      type: 'song',
      answer: 'Placeholder-svar K5-200',
      acceptedAnswers: [],
      revealTitle: 'Plassholder-tittel',
      revealArtist: 'Plassholder-artist',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-song.wav', startAtSeconds: 0, fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k5-300',
      categoryId: 'kategori-5',
      value: 300,
      type: 'image',
      answer: 'Placeholder-svar K5-300',
      acceptedAnswers: [],
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'image', src: '/media/images/placeholder-clue.svg' },
    },
    {
      id: 'k5-400',
      categoryId: 'kategori-5',
      value: 400,
      type: 'ai-song',
      answer: 'Placeholder-svar K5-400',
      acceptedAnswers: [],
      language: 'Plassholder-språk',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-ai-song.wav', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k5-500',
      categoryId: 'kategori-5',
      value: 500,
      type: 'song',
      answer: 'Placeholder-svar K5-500',
      acceptedAnswers: [],
      revealTitle: 'Plassholder-tittel',
      revealArtist: 'Plassholder-artist',
      explanation: 'Plassholder — skriv kort forklaring av hintet her.',
      media: { kind: 'audio', src: '/media/audio/placeholder-song.wav', startAtSeconds: 0, fadeInMs: 300, fadeOutMs: 600 },
    },
  ],
}
