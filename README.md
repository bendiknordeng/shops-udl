# Shops UDL Quiz

Vertsstyrt, Jeopardy-inspirert quizspill for utdrikningslaget til Anders «Shops»
Vandvik. Spesifikasjon i [`GAME_SPEC.md`](./GAME_SPEC.md), teknisk arkitektur i
[`STACK.md`](./STACK.md).

## Kom i gang

```bash
pnpm install
pnpm dev        # utviklingsserver
pnpm validate   # valider spillpakken (kjøres også i build)
pnpm build      # validering + typecheck + produksjonsbygg til dist/
pnpm preview    # serve produksjonsbygget lokalt
```

## Bytt ut plassholderne

Alt innhold er plassholdere. Før spillkvelden:

| Hva | Hvor | Merk |
| --- | --- | --- |
| Kategorier | `src/content/game-pack.ts` → `categories` | Ekte kategorinavn (navnedomener) |
| Spørsmål/svar | `src/content/game-pack.ts` → `clues` | Svar, aliaser, forklaring, fasit-info |
| Bilder | `public/media/images/` | Pek `media.src` på filen. Webp/jpg/svg |
| Sanger (AI + vanlig) | `public/media/audio/` | **Nøytrale filnavn** — aldri tittel/artist/svar. `startAtSeconds`, `endAtSeconds`, fades og volum settes per clue |
| Avatarer | `public/media/participants/<deltaker-id>.webp` | Mangler filen brukes initial-fallback automatisk |
| Lagnavn | `src/content/team-names.json` | Min. 100 unike navn, maks 32 tegn |

`pnpm validate` sjekker at pakken er konsistent og at alle refererte mediefiler
finnes (avatarer varsles kun — de har fallback). Ugyldig pakke blokkerer bygg
og deploy.

## Sette lagene manuelt

Default er tilfeldig trekning. Vil du bestemme lagene selv, fyll inn
`manualTeams` i `src/content/game-pack.ts` (kun kode, ikke UI):

```ts
manualTeams: [
  { name: 'Gutta på gulvet', participantIds: ['shops', 'lasse-frigstad', /* … */] },
  { participantIds: ['jon-wilberg', /* … */] }, // uten name → navn trekkes fra navnebanken
],
```

Alle 18 deltaker-IDer må fordeles nøyaktig én gang. Med `manualTeams` satt
skjules «Trekk lag på nytt» og lagantall-velgeren. Sett tilbake til `null` for
tilfeldig trekning.

## Avklarte regler (default-valg for GAME_SPEC §17)

Implementert slik — endres i `game-pack.ts` / `game-machine.ts` ved behov:

1. **Kategorier:** konfigurerbart; plassholder-pakken har 5.
2. **Alle kategorier har alle fem nivåer** i plassholder-pakken (valideringen
   krever kun unik kategori/poeng-kombinasjon, ikke fullt brett).
3. **Spørsmålstype-fordeling:** fri — settes per clue.
4. **Valgtur:** fast rundgang etter hver rute, uavhengig av hvem som fikk poeng.
5. **Aktivt lag kan svare flere ganger** innen svartiden — verten avgjør muntlig.
6. **Feil svar avslutter ikke eneretten** automatisk; verten kan avslutte
   manuelt («Åpen svarfase»).
7. **Ingen minuspoeng.**
8. **Lag kan få poeng selv etter tidligere feil svar** — verten bestemmer.
9. **Fasit:** verten velger fritt — kan vises både før og etter poengdeling.
10. **AI-sangens språk** vises som diskret hint i lydscenen når `language` er
    satt på cluen; alltid i fasiten.
11. **Verten kan restarte lydklipp** («Fra start») så mange ganger hen vil.
12. **Sanger fortsetter å spille etter tidsutløp** til verten pauser.
13. **Uavgjort:** alle topplag feires som vinnere i finalescenen.
14. **Ingen egen finalerunde** — ordinært brett + vinnersekvens.
15. **Lag:** min 2, maks 6 (`allowedTeamCounts`).
16. **Lagrekkefølge = trekningsrekkefølge** (stokkes ikke separat).
17. **Undo-dybde:** 20 (`rules.maxUndoDepth`).

## Vertskontroller

Dock nederst (kan foldes sammen). Poengtildeling krever alltid bekreftelse.
Snarveier: `Mellomrom` spill/pause lyd · `K` pause/fortsett tid · `O` åpen
svarfase · `F` fasit · `M` skjul/vis bilde · `B` til brettet · `R` trekk
tilbake poeng på aktiv rute · `U` angre · `Esc` hopp over animasjon.
På brettet velger `1–5` først akse og deretter rute. `'` bytter mellom
kolonne- og radmodus; `X` eller `Esc` fjerner markeringen.

### Privat vertsvindu (for skjermdeling)

Klikk «⧉ Vertsvindu» (i docken, eller øverst til høyre på startskjermen) for å
åpne kontrollene i et eget popup-vindu — del hovedvinduet på prosjektor og
behold vertsvinduet privat ved siden av. Vinduet snakker med hovedvinduet via
BroadcastChannel (samme nettleser/profil, samme origin — funker også som egen
fane). Docken i hovedvinduet kollapser automatisk når vertsvinduet er
tilkoblet.

Vertsvinduet kan alt docken kan (timer, lyd, fasit, poeng, angre, innstillinger,
åpne ruter fra eget mini-brett) — og viser i tillegg **fasiten privat** for
aktiv rute, uten at den havner i hovedvinduets DOM.

### Rekonstruere tilstand fra et tidligere spill

- **Avbryt rute** (i docken og vertsvinduet): lukker et åpent spørsmål uten å
  markere ruten brukt og uten å flytte turen.
- **Rekonstruer brett** (Innstillinger / vertsvinduets «Innstillinger og
  poengjustering»): marker enkeltruter brukt/ubrukt manuelt. Angres med `U`.
- **Se brettet** fra sluttskjermen for å inspisere eller korrigere spillet.
- Kombinér med manuell poengjustering og «Sett tur» for å gjenskape en
  komplett spilltilstand.

## Lagring og gjenopptakelse

Spilltilstanden lagres i IndexedDB etter hver handling. Refresh gir
«Fortsett spillet / Start på nytt». Angre-stacken overlever også refresh.
Lydposisjon huskes per rute i sessionStorage.

## Deploy

`.github/workflows/deploy.yml` bygger fra `main` og publiserer til
GitHub Pages med CNAME `hksplit.no`. Workflowen kjøres **kun manuelt**
(workflow_dispatch) — den skal ikke aktiveres før domene-cutover.
