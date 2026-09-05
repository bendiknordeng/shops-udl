import type { GamePackInput } from './schemas'

/**
 * Spillpakken for Shops UDL Quiz.
 *
 * Spillinnhold og media for spillkvelden:
 *  - bilder legges i  public/media/images/   (webp/jpg/svg)
 *  - sanger legges i  public/media/audio/    (mp3/m4a/wav) — nøytrale filnavn!
 *  - avatarer legges i public/media/participants/<deltaker-id>.webp
 *
 * Filnavn på media må ALDRI røpe svar, tittel eller artist.
 *
 * MANUELLE LAG (valgfritt):
 * Default er tilfeldig trekning. Vil du sette lagene selv, fyll inn
 * `manualTeams` nedenfor — da brukes de i stedet for trekning, og
 * «Trekk lag på nytt» skjules. Alle deltakere som ikke har
 * `excludedFromTeams` må fordeles nøyaktig én gang. `name` er valgfritt;
 * utelates det trekkes navn fra navnebanken.
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
  version: '1.1.0',
  title: 'SHOPS UDL',

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
    { id: 'kategori-1', title: 'Shops at the Movies' },
    { id: 'kategori-2', title: 'Hvor i all verden er Vandvik?' },
    { id: 'kategori-3', title: 'The Life of Shops' },
    { id: 'kategori-4', title: 'Anders på flaska' },
    { id: 'kategori-5', title: 'Voff Voff' },
  ],

  clues: [
    // ── Kategori 1 ─────────────────────────────────────────────
    {
      id: 'k1-100',
      categoryId: 'kategori-1',
      value: 100,
      type: 'image',
      answer: 'Wolf of Wall Street',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k1-100.png' },
    },
    {
      id: 'k1-200',
      categoryId: 'kategori-1',
      value: 200,
      type: 'ai-song',
      answer: 'High School Musical',
      acceptedAnswers: [],
      revealTitle: 'Breaking Free',
      media: { kind: 'audio', src: '/media/audio/k1-200.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k1-300',
      categoryId: 'kategori-1',
      value: 300,
      type: 'image',
      answer: 'Parasite',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k1-300.png' },
    },
    {
      id: 'k1-400',
      categoryId: 'kategori-1',
      value: 400,
      type: 'ai-song',
      answer: 'Transformers',
      acceptedAnswers: [],
      bonusInfo: 'Monolog Optimus Prime',
      media: { kind: 'audio', src: '/media/audio/k1-400.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k1-500',
      categoryId: 'kategori-1',
      value: 500,
      type: 'image',
      answer: 'A Beautiful Mind',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k1-500.jpg' },
    },

    // ── Kategori 2 ─────────────────────────────────────────────
    {
      id: 'k2-100',
      categoryId: 'kategori-2',
      value: 100,
      type: 'song',
      answer: 'Down Under',
      acceptedAnswers: [],
      revealArtist: 'Men at Work',
      media: { kind: 'audio', src: '/media/audio/k2-100.mp3', fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k2-200',
      categoryId: 'kategori-2',
      value: 200,
      type: 'image',
      answer: 'Praha',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k2-200.png' },
    },
    {
      id: 'k2-300',
      categoryId: 'kategori-2',
      value: 300,
      type: 'image',
      answer: 'Amsterdam',
      acceptedAnswers: [],
      bonusInfo: 'Furu = Probe',
      media: { kind: 'image', src: '/media/images/k2-300.png' },
    },
    {
      id: 'k2-400',
      categoryId: 'kategori-2',
      value: 400,
      type: 'image',
      answer: 'Singapore',
      acceptedAnswers: [],
      bonusInfo: 'Marina Bay Sands',
      media: { kind: 'image', src: '/media/images/k2-400.png' },
    },
    {
      id: 'k2-500',
      categoryId: 'kategori-2',
      value: 500,
      type: 'image',
      answer: 'Budapest',
      acceptedAnswers: [],
      bonusInfo: 'Buddha + pest',
      media: { kind: 'image', src: '/media/images/k2-500.jpeg' },
    },

    // ── Kategori 3 ─────────────────────────────────────────────
    {
      id: 'k3-100',
      categoryId: 'kategori-3',
      value: 100,
      type: 'song',
      answer: 'Fødsel',
      acceptedAnswers: [],
      revealTitle: 'Circle of Life',
      bonusInfo: 'Løvenes konge',
      media: { kind: 'audio', src: '/media/audio/k3-100.mp3', fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k3-200',
      categoryId: 'kategori-3',
      value: 200,
      type: 'image',
      answer: 'Pensjonering',
      acceptedAnswers: [],
      explanation: 'Gullklokke',
      media: { kind: 'image', src: '/media/images/k3-200.png' },
    },
    {
      id: 'k3-300',
      categoryId: 'kategori-3',
      value: 300,
      type: 'ai-song',
      answer: 'Døden',
      acceptedAnswers: [],
      revealTitle: 'Another One Bites the Dust',
      media: { kind: 'audio', src: '/media/audio/k3-300.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k3-400',
      categoryId: 'kategori-3',
      value: 400,
      type: 'image',
      answer: 'Bryllup',
      acceptedAnswers: [],
      explanation: 'Noe gammelt, noe nytt, noe lånt og noe blått',
      media: { kind: 'image', src: '/media/images/k3-400.png' },
    },
    {
      id: 'k3-500',
      categoryId: 'kategori-3',
      value: 500,
      type: 'ai-song',
      answer: 'Ungdomstid',
      acceptedAnswers: ['Pubertet', 'Konfirmasjon'],
      revealTitle: 'Til ungdommen',
      media: { kind: 'audio', src: '/media/audio/k3-500.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },

    // ── Kategori 4 ─────────────────────────────────────────────
    {
      id: 'k4-100',
      categoryId: 'kategori-4',
      value: 100,
      type: 'ai-song',
      answer: 'Akevitt',
      acceptedAnswers: [],
      media: { kind: 'audio', src: '/media/audio/k4-100.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k4-200',
      categoryId: 'kategori-4',
      value: 200,
      type: 'image',
      answer: 'Cuba Libre',
      acceptedAnswers: [],
      bonusInfo: 'Fidel Castro',
      media: { kind: 'image', src: '/media/images/k4-200.png' },
    },
    {
      id: 'k4-300',
      categoryId: 'kategori-4',
      value: 300,
      type: 'song',
      answer: 'Veuve Clicquot',
      acceptedAnswers: [],
      revealTitle: 'En solskinnsdag',
      media: { kind: 'audio', src: '/media/audio/k4-300.mp3', fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k4-400',
      categoryId: 'kategori-4',
      value: 400,
      type: 'image',
      answer: 'White Russian',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k4-400.jpeg' },
    },
    {
      id: 'k4-500',
      categoryId: 'kategori-4',
      value: 500,
      type: 'ai-song',
      answer: 'Øl',
      acceptedAnswers: [],
      media: { kind: 'audio', src: '/media/audio/k4-500.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },

    // ── Kategori 5 ─────────────────────────────────────────────
    {
      id: 'k5-100',
      categoryId: 'kategori-5',
      value: 100,
      type: 'song',
      answer: 'Ape',
      acceptedAnswers: [],
      revealTitle: 'Knee Socks',
      media: { kind: 'audio', src: '/media/audio/k5-100.mp3', fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k5-200',
      categoryId: 'kategori-5',
      value: 200,
      type: 'ai-song',
      answer: 'Fisk',
      acceptedAnswers: [],
      revealArtist: 'Karpe',
      media: { kind: 'audio', src: '/media/audio/k5-200.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k5-300',
      categoryId: 'kategori-5',
      value: 300,
      type: 'ai-song',
      answer: 'Ørn',
      acceptedAnswers: [],
      revealTitle: 'Eagles, Hotel California',
      media: { kind: 'audio', src: '/media/audio/k5-300.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k5-400',
      categoryId: 'kategori-5',
      value: 400,
      type: 'image',
      answer: 'Løve',
      acceptedAnswers: [],
      bonusInfo: 'Stortinget og Løvebakken',
      media: { kind: 'image', src: '/media/images/k5-400.png' },
    },
    {
      id: 'k5-500',
      categoryId: 'kategori-5',
      value: 500,
      type: 'song',
      answer: 'Katt',
      acceptedAnswers: [],
      revealTitle: 'Year of the Cat',
      media: { kind: 'audio', src: '/media/audio/k5-500.mp3', fadeInMs: 300, fadeOutMs: 600 },
    },
  ],
}
