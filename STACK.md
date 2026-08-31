# Shops UDL Quiz — Technical Stack

## Product shape

Shops UDL Quiz is a host-controlled, Jeopardy-inspired music and image quiz.
It runs as a static browser app on one primary display and persists an active
game locally so an accidental refresh does not lose progress.

Product behavior and provisional game rules are specified in
[`GAME_SPEC.md`](./GAME_SPEC.md).

The first release assumes:

- one host controls the game;
- one shared screen is visible to all participants;
- questions, categories, media, participant roster, and configuration are
  bundled with the app;
- participants are randomly allocated to a host-selected number of teams;
- team names are selected randomly from a pre-generated local name bank;
- host actions decide when the game advances;
- unresolved game rules are listed in `GAME_SPEC.md`.

## Core stack

| Concern | Choice | Purpose |
| --- | --- | --- |
| UI framework | React + TypeScript | Component model, typed props, and predictable rendering |
| Build tool | Vite | Fast local development and static production builds |
| Package manager | pnpm | Deterministic dependency management |
| Game orchestration | XState v5 + `@xstate/react` | Explicit game phases, legal transitions, turn flow, and recovery |
| Local persistence | Dexie + IndexedDB | Durable game snapshots, scores, progress, and migrations |
| Runtime validation | Zod | Validate game packs and restored local state before use |
| Audio | Howler.js | Playback, preloading, seeking, fades, and browser compatibility |
| Cinematic animation | GSAP + `@gsap/react` | Sequenced, pausable, reversible scene transitions |
| GPU effects | PixiJS v8 | Particles, light, texture, confetti, and audio-reactive effects |
| Styling | Custom CSS + CSS Modules | Bespoke visual system without a generic component-library look |
| Team-name data | Source-controlled JSON | Pre-generated names with deterministic local validation |
| Frontend deployment | GitHub Pages | Static hosting on the repository's custom domain |

Dependencies should be pinned through `pnpm-lock.yaml`. Use current stable
versions when the app is scaffolded.

## Architecture principles

### One source of truth

XState owns all meaningful game state. React renders the current snapshot.
GSAP, PixiJS, audio, and persistence react to state transitions but never
independently decide game outcomes.

Examples of state owned by the game machine:

- current phase;
- active category and clue;
- participant roster and random team allocation;
- team order and active team;
- generated or manually edited team names;
- scores;
- used clues;
- countdown deadline and status;
- revealed answer state;
- host overrides;
- current round and completion state.

### Event-driven control

Host controls send typed events to the game machine. Representative events:

```text
START_GAME
ALLOCATE_TEAMS
ASSIGN_TEAM_NAMES
OPEN_CLUE
MEDIA_READY
START_COUNTDOWN
PAUSE_COUNTDOWN
RESUME_COUNTDOWN
COUNTDOWN_EXPIRED
REVEAL_ANSWER
OPEN_ANSWER_PHASE
AWARD_CLUE
NO_CORRECT_ANSWER
ADJUST_SCORE
UNDO_LAST_DECISION
RETURN_TO_BOARD
ADVANCE_TURN
CHANGE_ACTIVE_TEAM
RESET_GAME
```

Exact event behavior follows `GAME_SPEC.md`. Its explicitly unresolved rules
must be decided before the corresponding transitions are finalized.

### State and animation handshake

Animation must be deterministic and interruptible:

```text
Host event
→ XState enters a transition state
→ scene controller starts a GSAP timeline
→ PixiJS renders supporting effects
→ timeline completion emits a typed event
→ XState enters the next interactive state
```

The host can skip nonessential animation. Skipping completes the current
timeline and moves the machine to the same final state as natural completion.

Animations never contain score, turn, or rule logic.

## UI and rendering layers

The application uses three deliberate visual layers:

1. **React DOM layer** — game board, questions, answers, participants, scores,
   timer text, and host controls.
2. **GSAP choreography layer** — component entrances, exits, board-to-clue
   transitions, reveals, score changes, and scene sequences.
3. **PixiJS effects layer** — ambient particles, light sweeps, texture, bursts,
   audio response, and celebratory effects.

Core content remains DOM-based for crisp typography, accessibility, responsive
layout, and reliable interaction. PixiJS is an enhancement layer, not the app's
primary renderer.

## Visual system

The target direction is a modern club stage mixed with a retro television game
show. It should feel authored and theatrical, not like a generated SaaS UI.

Implementation rules:

- no general-purpose UI kit;
- no default component-library styling;
- custom type scale, spacing, colors, borders, shadows, and motion curves;
- limited palette with high-contrast stage lighting;
- typography carries hierarchy rather than nested cards;
- effects support a game event and do not run only as decoration;
- avoid stock gradients, glassmorphism, excessive rounded containers, and
  generic dashboard layouts;
- support `prefers-reduced-motion` with shorter fades and no spatially intense
  movement.

Potential interactive components:

- dimensional clue tiles with pointer-responsive light and depth;
- board-to-clue expansion transition;
- masked image reveals;
- audio-reactive music visualizer;
- participant podium and active-turn spotlight;
- circular or typographic countdown sequence;
- physical score odometer;
- correct, incorrect, and timeout scene responses;
- category and round title sequences;
- final scoreboard and winner sequence;
- discreet host control dock.

## Countdown design

The timer uses an absolute deadline instead of decrementing a stored counter.
This avoids drift when rendering slows or the tab briefly loses focus.

Persisted timer data should include:

- configured duration;
- deadline;
- remaining duration when paused;
- timer status.

Visual updates may use `requestAnimationFrame`, but React should not re-render
the complete app every frame. The game machine receives a single expiry event
when the deadline is reached.

## Audio architecture

Howler.js manages question audio and game sound effects.

Responsibilities:

- unlock audio following the host's first user gesture;
- preload current and likely-next assets;
- provide play, pause, stop, seek, volume, and fade controls;
- stop or fade media during scene changes;
- report loading and playback failures to the host;
- expose analyser data to the visualizer when supported;
- keep sound effects and question media on separate volume channels.

Audio-reactive graphics must not expose track titles, filenames, durations, or
other accidental hints.

Media files are bundled locally for deterministic playback. Formats and sizes
will be normalized before inclusion. The host must have appropriate rights to
publish any music or images served from the public domain.

## Content model

Game content is source-controlled and loaded as a typed game pack. TypeScript
is preferred over unrestricted JSON because it supports readable authoring,
asset imports, and compile-time checks. Zod provides runtime validation.

Conceptual structure:

```ts
type GamePack = {
  id: string
  title: string
  participants: ParticipantDefinition[]
  allowedTeamCounts: number[]
  defaultAnswerSeconds: number
  teamNames: string[]
  categories: CategoryDefinition[]
  clues: ClueDefinition[]
  presentation: PresentationConfig
  rules: RulesConfig
}
```

A clue has exactly one of the supported media types:

```ts
type ClueType = 'image' | 'ai-song' | 'song'

type ClueMedia = ImageMedia | AudioMedia
```

Representative clue fields:

- stable ID;
- category ID;
- value restricted to `100`, `200`, `300`, `400`, or `500`;
- question type;
- answer and accepted aliases;
- optional explanation and reveal content;
- local image or audio reference;
- media start offset, optional end offset, and fade configuration;
- presentation variant;
- attribution or internal authoring notes.

The build validates that every category/value pair is unique, media matches the
question type, referenced assets exist, and every participant has an avatar or
fallback.

## Pre-generated team-name bank

The team-name bank is stored as source-controlled JSON and validated with Zod
at app startup. It contains enough unique names for the configured maximum team
count.

During setup the browser:

- shuffles the validated local name bank;
- assigns one unique name to each allocated team;
- persists the assignment with the game session;
- allows the host to draw new names before game start;
- allows manual editing before game start;
- performs no network request.

## Persistence model

IndexedDB stores runtime state through Dexie. It is separate from
`sessionStorage`.

Suggested IndexedDB tables:

| Table | Contents |
| --- | --- |
| `sessions` | Game snapshot, team allocation/names, scores, timer, timestamps, pack version, and status |
| `history` | Optional append-only host actions for undo and diagnostics |
| `settings` | Answer duration, volume, display, and reduced-effects preferences |

`sessionStorage` is limited to ephemeral browser-tab state such as:

- whether the host dock is open;
- the current host-control tab;
- temporary confirmation state;
- a pointer to the active IndexedDB session.

Every meaningful XState transition schedules a narrow persistence update.
Writes are serialized to avoid an older snapshot overwriting a newer one.

On startup:

1. load and validate the bundled game pack;
2. inspect IndexedDB for an unfinished compatible session;
3. validate and migrate the stored snapshot;
4. offer resume or start over;
5. never silently merge incompatible game-pack versions.

## Undo and recovery

Host mistakes should be recoverable. The preferred design is an append-only
event history plus periodic snapshots. Initial implementation may use bounded
snapshot history if event replay adds disproportionate complexity.

Recovery targets:

- browser refresh;
- accidental navigation;
- mistaken score decision;
- mistaken active-team selection;
- interrupted animation;
- audio loading failure.

Resetting a game requires an explicit host confirmation and creates a fresh
session instead of mutating the bundled game pack.

## Host controls

Host controls are part of the same app and machine, not a separate admin app.
They should remain visually quiet during normal play.

Input methods:

- pointer and touch controls;
- documented keyboard shortcuts;
- fullscreen toggle;
- emergency skip for animation or failed media;
- manual participant and score override;
- pause and resume;
- volume controls for media and effects.

Potential keyboard mapping will be chosen after the game rules are specified.
Destructive shortcuts must require confirmation or a deliberate key sequence.

## Responsive target

Primary target is a laptop connected to a television or projector at 16:9.
The layout should also function on a laptop without an external display.

Initial support targets:

- current desktop Chrome, Safari, Firefox, and Edge;
- 1280×720 minimum game-stage viewport;
- pointer, touch, and keyboard input;
- fullscreen mode;
- safe scaling for 16:9 and wider displays.

## Performance strategy

- preload only the active scene and likely-next media;
- decode images before reveal;
- normalize image dimensions and audio encoding during authoring;
- animate transforms and opacity where possible;
- avoid React state updates on every animation frame;
- keep persistent PixiJS objects and reuse particle pools;
- pause ambient rendering when the document is hidden;
- provide a reduced-effects mode for weaker hardware;
- lazy-load PixiJS scenes not needed during setup;
- release Howler and PixiJS resources when a game ends.

The app must remain usable if optional GPU effects fail. Core gameplay, audio
controls, scoring, and host actions stay in the DOM layer.

## Error handling

Errors should be surfaced through a compact host-only status area. Player-facing
screens should show designed fallback states rather than technical messages.

Required fallbacks:

- missing or invalid game pack blocks game start with actionable details;
- failed image shows a neutral clue placeholder;
- failed audio enables retry, skip, or answer reveal;
- failed persistence keeps the current in-memory game running and warns host;
- interrupted animation can be completed immediately;
- invalid restored state is quarantined rather than loaded.

## Proposed repository structure

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   └── media/
│       ├── audio/
│       ├── images/
│       ├── participants/
│       └── textures/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── providers.tsx
│   ├── content/
│   │   ├── game-pack.ts
│   │   ├── participants.json
│   │   ├── team-names.json
│   │   └── schemas.ts
│   ├── game/
│   │   ├── game-machine.ts
│   │   ├── game-events.ts
│   │   ├── allocate-teams.ts
│   │   ├── selectors.ts
│   │   └── persistence.ts
│   ├── audio/
│   │   ├── audio-engine.ts
│   │   └── visualizer.ts
│   ├── animation/
│   │   ├── scene-controller.ts
│   │   ├── timelines/
│   │   └── effects/
│   ├── components/
│   │   ├── setup/
│   │   ├── board/
│   │   ├── clue/
│   │   ├── participants/
│   │   ├── timer/
│   │   ├── scoreboard/
│   │   └── host-controls/
│   ├── scenes/
│   │   ├── setup/
│   │   ├── board/
│   │   ├── clue/
│   │   ├── round-transition/
│   │   └── finale/
│   ├── storage/
│   │   ├── database.ts
│   │   └── migrations.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   └── motion.css
│   ├── types/
│   └── main.tsx
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── vite.config.ts
```

## Deployment

The complete app remains static. Vite builds to `dist`, and GitHub Actions
publishes that artifact to GitHub Pages.

Frontend deployment requirements:

- use `/` as the Vite base because the site has a custom root domain;
- preserve the custom-domain configuration for `hksplit.no` during temporary
  deployment;
- deploy only from `shops-udl-quiz` while the temporary app is active;
- keep the existing `main/docs` site untouched for rollback;
- validate all referenced media during the build;
- block deployment if the game pack is invalid;
- switch the Pages source back to `main/docs` for rollback.

The frontend deployment workflow should not be activated until the app is ready
for the temporary domain cutover.

## Explicitly deferred

The current rule discussion and full open-decision list live in
`GAME_SPEC.md`. Remaining stack-relevant decisions include:

- category and clue counts;
- fixed versus free distribution of question types;
- confirmed turn behavior after another team receives points;
- wrong-answer and repeated-answer behavior;
- final or tie-break round requirements;
- tie-breaking;
- exact minimum and maximum team counts;
- retention depth for undo history.
