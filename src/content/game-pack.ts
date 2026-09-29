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
  title: 'Italiensk aften',

  allowedTeamCounts: [2, 3, 4],
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
    { id: 'kategori-1', title: 'Hvilken låt?' },
    { id: 'kategori-2', title: "Who's my daddy?" },
    { id: 'kategori-3', title: 'Tall og bokstaver' },
    { id: 'kategori-4', title: 'Brandy og Herr Visvas' },
    { id: 'kategori-5', title: 'mjau' },
  ],

  clues: [
    // ── Kategori 1 ─────────────────────────────────────────────
    {
      id: 'k1-100',
      categoryId: 'kategori-1',
      value: 100,
      type: 'ai-image',
      answer: 'Ice Ice Baby',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k1-100.png' },
    },
    {
      id: 'k1-200',
      categoryId: 'kategori-1',
      value: 200,
      type: 'ai-image',
      answer: 'Ølbriller',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k1-200.jpg' },
    },
    {
      id: 'k1-300',
      categoryId: 'kategori-1',
      value: 300,
      type: 'ai-image',
      answer: 'Losing My Religion',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k1-300.png' },
    },
    {
      id: 'k1-400',
      categoryId: 'kategori-1',
      value: 400,
      type: 'ai-image',
      answer: 'Homewrecker',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k1-400.png' },
    },
    {
      id: 'k1-500',
      categoryId: 'kategori-1',
      value: 500,
      type: 'ai-image',
      answer: 'Only Girl (In the World)',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k1-500.png' },
    },

    // ── Kategori 2 ─────────────────────────────────────────────
    {
      id: 'k2-100',
      categoryId: 'kategori-2',
      value: 100,
      type: 'image',
      answer: 'Billy Ray',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k2-100.jpeg' },
    },
    {
      id: 'k2-200',
      categoryId: 'kategori-2',
      value: 200,
      type: 'image',
      answer: 'Morten Harket',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k2-200.jpeg' },
    },
    {
      id: 'k2-300',
      categoryId: 'kategori-2',
      value: 300,
      type: 'image',
      answer: 'Phil Collins',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k2-300.webp' },
    },
    {
      id: 'k2-400',
      categoryId: 'kategori-2',
      value: 400,
      type: 'image',
      answer: 'Gustav Witzøe',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k2-400.jpg' },
    },
    {
      id: 'k2-500',
      categoryId: 'kategori-2',
      value: 500,
      type: 'image',
      answer: 'Lenny Kravitz',
      acceptedAnswers: [],
      media: { kind: 'image', src: '/media/images/k2-500.jpg' },
    },

    // ── Kategori 3 ─────────────────────────────────────────────
    {
      id: 'k3-100',
      categoryId: 'kategori-3',
      value: 100,
      type: 'text',
      answer: '24 timer i et døgn',
      acceptedAnswers: [],
      media: { kind: 'text', prompt: '24 T i et D' },
    },
    {
      id: 'k3-200',
      categoryId: 'kategori-3',
      value: 200,
      type: 'text',
      answer: 'De ti bud',
      acceptedAnswers: [],
      media: { kind: 'text', prompt: 'D 10 B' },
    },
    {
      id: 'k3-300',
      categoryId: 'kategori-3',
      value: 300,
      type: 'text',
      answer: '64 ruter på et sjakkbrett',
      acceptedAnswers: [],
      media: { kind: 'text', prompt: '64 R på et S' },
    },
    {
      id: 'k3-400',
      categoryId: 'kategori-3',
      value: 400,
      type: 'text',
      answer: '18 hull i en runde med golf',
      acceptedAnswers: [],
      media: { kind: 'text', prompt: '18 H i en R med G' },
    },
    {
      id: 'k3-500',
      categoryId: 'kategori-3',
      value: 500,
      type: 'text',
      answer: '118 grunnstoffer i periodesystemet',
      acceptedAnswers: [],
      media: { kind: 'text', prompt: '118 G i P' },
    },

    // ── Kategori 4 ─────────────────────────────────────────────
    {
      id: 'k4-100',
      categoryId: 'kategori-4',
      value: 100,
      type: 'ai-song',
      answer: 'Grandiosa',
      acceptedAnswers: [],
      revealTitle: 'Lørdagspizza',
      media: { kind: 'audio', src: '/media/audio/k4-100.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k4-200',
      categoryId: 'kategori-4',
      value: 200,
      type: 'ai-song',
      answer: 'Toyota',
      acceptedAnswers: [],
      revealTitle: "Toyota'n til Magdi",
      revealArtist: 'Karpe',
      media: { kind: 'audio', src: '/media/audio/k4-200.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k4-300',
      categoryId: 'kategori-4',
      value: 300,
      type: 'song',
      answer: 'Versace',
      acceptedAnswers: [],
      revealTitle: 'Versace on the Floor',
      revealArtist: 'Bruno Mars',
      media: { kind: 'audio', src: '/media/audio/k4-300.mp3', fadeInMs: 300, fadeOutMs: 600 },
    },
    {
      id: 'k4-400',
      categoryId: 'kategori-4',
      value: 400,
      type: 'song',
      answer: 'Reebok',
      acceptedAnswers: [],
      revealTitle: 'Low',
      revealArtist: 'Flo Rida',
      media: { kind: 'audio', src: '/media/audio/k4-400.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k4-500',
      categoryId: 'kategori-4',
      value: 500,
      type: 'ai-song',
      answer: 'Prada',
      acceptedAnswers: [],
      revealTitle: 'Prada',
      revealArtist: 'Cassö & Raye',
      media: { kind: 'audio', src: '/media/audio/k4-500.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },

    // ── Kategori 5 ─────────────────────────────────────────────
    {
      id: 'k5-100',
      categoryId: 'kategori-5',
      value: 100,
      type: 'song',
      answer: 'Tiger',
      acceptedAnswers: [],
      revealTitle: 'Eye of the Tiger',
      revealArtist: 'Survivor',
      media: { kind: 'audio', src: '/media/audio/k5-100.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k5-200',
      categoryId: 'kategori-5',
      value: 200,
      type: 'song',
      answer: 'Impala',
      acceptedAnswers: [],
      revealTitle: 'Dracula',
      revealArtist: 'Tame Impala',
      media: { kind: 'audio', src: '/media/audio/k5-200.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k5-300',
      categoryId: 'kategori-5',
      value: 300,
      type: 'song',
      answer: 'Pony',
      acceptedAnswers: [],
      revealTitle: 'Pink Pony Club',
      revealArtist: 'Chappell Roan',
      media: { kind: 'audio', src: '/media/audio/k5-300.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k5-400',
      categoryId: 'kategori-5',
      value: 400,
      type: 'song',
      answer: 'Hest',
      acceptedAnswers: ['Hjort'],
      revealTitle: 'Friskis',
      revealArtist: 'Kjartan Lauritzen',
      media: { kind: 'audio', src: '/media/audio/k5-400.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
    {
      id: 'k5-500',
      categoryId: 'kategori-5',
      value: 500,
      type: 'ai-song',
      answer: 'Løve',
      acceptedAnswers: ['Tiger'],
      revealTitle: 'Roar',
      revealArtist: 'Katy Perry',
      media: { kind: 'audio', src: '/media/audio/k5-500.mp3', fadeInMs: 400, fadeOutMs: 600 },
    },
  ],
}
