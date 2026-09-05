# Shops UDL Quiz — Game Specification

## 1. Formål

Shops UDL Quiz er et vertsstyrt, Jeopardy-inspirert quizspill laget for
utdrikningslaget til Anders «Shops» / «Fattern» Vandvik.

Spillet kombinerer egenproduserte bilder, AI-genererte sanger og vanlige
sanger. Deltakerne fordeles tilfeldig på lag før start. Ett lag velger en rute,
får en tidsbegrenset svarfase og kan deretter miste eneretten mens verten
muntlig åpner for de andre lagene.

Dette dokumentet beskriver produktatferd og spillflyt. Teknisk arkitektur er
beskrevet i [`STACK.md`](./STACK.md).

## 2. Spillformat

### 2.1 Brett

Spillbrettet består av:

- kategorier som kolonner;
- poengnivåene `100`, `200`, `300`, `400` og `500` som rader;
- én rute per kombinasjon av kategori og poengnivå;
- én av tre spørsmålstyper per rute;
- synlig poengverdi og spørsmålstypeikon på hver ubrukte rute;
- tydelig markering av brukte ruter uten å fjerne brettets struktur.

Høyere poengverdi betyr høyere forventet vanskelighetsgrad. Riktig svar gir
rutens poengverdi.

Antall kategorier bestemmes senere. Innholdsmodellen skal derfor støtte et
konfigurerbart antall kolonner uten å hardkode bredden til brettet.

### 2.2 Svarprinsipp

Hvert spørsmål har ett forventet navn som svar. Navnet tilhører kategorien som
står over ruten.

Eksempel på abstrakt struktur:

```text
Kategori: [bestemmes senere]
Poeng: 300
Type: bilde
Hint: AI-generert bilde av Shops i et scenario
Forventet svar: navnet innenfor kategorien som bildet peker mot
```

Aksepterte alternative stavemåter, aliaser eller delvise svar kan registreres i
innholdet, men verten avgjør muntlig om svaret godkjennes.

## 3. Spørsmålstyper

### 3.1 Bildebasert

Et AI-generert bilde viser Anders i et scenario som hinter til riktig navn
innenfor valgt kategori.

Atferd:

- bildet er ferdig generert og lagret lokalt før spillet;
- bildet dekodes før ruten åpnes;
- bildet vises stort med scenetilpasset introduksjonsanimasjon;
- bildet forblir synlig etter at den første svarfristen utløper;
- verten kan skjule eller vise bildet igjen ved behov;
- bildebeskrivelse må ikke avsløre svaret.

### 3.2 AI-sang

En forhåndsprodusert AI-generert sang bruker sangtekst som er oversatt til et
annet språk. Deltakerne skal identifisere riktig navn innenfor kategorien.

Atferd:

- sangen genereres og lagres lokalt før spillet;
- språk kan registreres som metadata og eventuelt vises som hint;
- avspilling starter sammen med den aktive svarfasen;
- verten kan spille av, pause og fortsette sangen;
- sangen kan fortsette etter at den første svarfristen utløper;
- filnavn, metadata og spiller-UI må ikke røpe originaltittel eller svar;
- lydvisualisering skal være dekorativ og ikke vise identifiserende metadata.

### 3.3 Vanlig sang

En forhåndsvalgt ordinær sang hinter til riktig navn innenfor kategorien.

Atferd:

- lydklippet lagres lokalt før spillet;
- innholdet kan angi startpunkt i sangen;
- avspilling starter sammen med den aktive svarfasen;
- verten kan spille av, pause og fortsette sangen;
- sangen kan fortsette etter at den første svarfristen utløper;
- filnavn, metadata og spiller-UI må ikke røpe sangtittel, artist eller svar.

### 3.4 Typeikoner

Hver rute viser et eget ikon før den velges:

| Type | Visuell idé | Tekstlig etikett |
| --- | --- | --- |
| Bilde | Bilderamme eller kameralinse | `Bilde` |
| AI-sang | Bølgeform kombinert med gnist | `AI-sang` |
| Vanlig sang | Vinylplate eller musikknote | `Sang` |

Ikonene skal være egne SVG-er i samme formspråk. Type må skilles med form,
ikke bare farge. Brettet skal ha en kompakt tegnforklaring.

## 4. Deltakere og lag

### 4.1 Forhåndsdefinert deltakerliste

Spillpakken har 18 deltakere registrert i `src/content/participants.json`.
Hver deltaker har:

- stabil ID;
- visningsnavn;
- avatarbilde;
- valgfritt flagg som viser deltakeren med rødt kryss og utelater dem fra lag;
- valgfri intern kommentar som aldri vises i spillet.

Avatarbilder lagres som WebP i `public/media/participants/`. Hver deltakers
`avatar`-felt peker på den faste filbanen som brukes av appen.

### 4.2 Valg av antall lag

Startskjermen lar verten velge antall lag. Tillatte verdier kommer fra
spillkonfigurasjonen. Foreslått startområde er to til seks lag, begrenset av
antall deltakere og tilgjengelig plass på leaderboardet.

Kontrollen viser umiddelbart:

- valgt antall lag;
- forventet størrelse per lag;
- eventuell ulik fordeling når deltakerantallet ikke går opp.

### 4.3 Tilfeldig lagfordeling

Når verten fordeler lag:

1. deltakere uten ekskluderingsflagg stokkes med en uniform shuffle;
2. deltakerne fordeles sekvensielt på lag;
3. størrelsesforskjellen mellom største og minste lag blir maksimalt én;
4. lagrekkefølgen blir også spillrekkefølgen;
5. resultatet lagres slik at refresh ikke gir en ny fordeling.

Startskjermen har `Trekk lag på nytt`. Knappen er tilgjengelig frem til spillet
starter. Etter spillstart krever ny trekning full omstart.

### 4.4 Lagnavn

Lagnavn lagres som en lokal, validert navnebank i spillpakken.

Før spillet starter kan verten:

- godkjenne forslagene;
- redigere et navn manuelt;
- trekke et nytt sett unike navn fra den lokale navnebanken.

Navnene valideres for antall, unikhet, lengde og tomme verdier. Godkjente navn
lagres sammen med spilløkten.

## 5. Startskjerm

Startskjermen skal være enkel og scenepreget, ikke et adminskjema.

Flyt:

1. vis tittel og kort intro;
2. velg antall lag;
3. sett svartid med slider;
4. trekk deltakere tilfeldig;
5. trekk unike lagnavn fra lokal navnebank;
6. vis alle lag med navn og avatargruppe;
7. tillat ny trekning, nye navn og manuell navneendring;
8. start spillet med eksplisitt handling.

`Start spillet` er deaktivert frem til:

- alle deltakere uten ekskluderingsflagg er fordelt én gang;
- alle lag har navn;
- alle avatarressurser er lastet eller har fallback;
- spillpakken er valid;
- minst ett spørsmål finnes.

## 6. Tidsinnstilling

Verten velger svartid med en slider merket i sekunder.

Foreslått standard:

- standardverdi: `30 sekunder`;
- minimum: `10 sekunder`;
- maksimum: `90 sekunder`;
- steg: `5 sekunder`.

Slideren kombineres med synlig tallverdi og tastaturvennlig justering. Valget
lagres lokalt.

Hvis verten endrer svartiden under spillet, gjelder endringen fra neste
spørsmål. En aktiv nedtelling endres ikke retroaktivt.

## 7. Vedvarende spilleflate

### 7.1 Leaderboard

Leaderboardet er synlig gjennom hele aktive spillopplevelsen, også når et
spørsmål er åpnet.

Hvert lag vises med:

- lagnavn;
- alle lagmedlemmenes avatarer samlet;
- nåværende poengsum;
- tydelig aktiv-tur-markering;
- midlertidig poengendring under award-animasjon.

Leaderboardet skal ikke dekkes av spørsmål, media, timer eller vertskontroller.
På smalere skjermer kan det skifte mellom sidepanel og toppstripe.

### 7.2 Aktivt lag

Laget som velger rute markeres med:

- spotlight eller scenelys;
- subtil skalering og dybde;
- turindikator;
- fremhevet avatargruppe;
- animert overgang fra forrige lag.

Visuell aktivitet skal være tydelig uten at alle andre lag forsvinner.

### 7.3 Vertskontroller

Vertskontrollene ligger i en kompakt dock som kan foldes sammen. De skal være
lette å treffe på laptop og prosjektorskjerm, men visuelt sekundære for
deltakerne.

Kontroller som alltid må være tilgjengelige i relevant fase:

- spill av / pause media;
- pause / fortsett nedtelling;
- gå til åpen svarfase;
- vis / skjul fasit;
- velg laget som svarte riktig;
- marker ingen riktige svar;
- angre siste poenghandling;
- gå videre til brettet;
- hopp over en fastlåst animasjon;
- åpne lyd- og tidsinnstillinger.

Ugyldige handlinger skjules eller deaktiveres basert på spillfasen.

## 8. Tur- og spørsmålsflyt

### 8.1 Valg av rute

1. aktivt lag fremheves;
2. laget velger muntlig kategori og poengnivå;
3. verten åpner den tilsvarende ruten;
4. ruten låses umiddelbart mot nye klikk;
5. brettet går inn i en animert overgang til spørsmålet;
6. media klargjøres;
7. svarfasen starter når presentasjonen er klar.

For lydspørsmål skal nedtelling og lyd starte koordinert. En rute regnes ikke
som aktiv før lydressursen enten er klar eller verten har valgt fallback.

### 8.2 Aktiv svarfase

Den aktive svarfasen tilhører laget som valgte ruten.

- nedtellingen er stor og alltid synlig;
- bilde eller lyd presenteres;
- bare aktivt lag har formell svarrett;
- verten håndterer alle svar muntlig;
- det finnes ingen deltakerknapper eller buzzer i første versjon;
- verten kan pause og fortsette både timer og lyd;
- verten kan avslutte fasen manuelt før tiden går ut.

### 8.3 Når tiden utløper

Ved null:

- nedtellingen stopper og blir stående på null;
- aktivt lags enerett avsluttes;
- UI går inn i `åpen svarfase`;
- valgt bilde forblir synlig;
- sang kan fortsette å spille;
- verten får enkle play/pause-kontroller;
- ingen poeng deles ut automatisk;
- turrekkefølge eller score endres ikke automatisk.

Verten ber muntlig de andre lagene om svar. Appen trenger ingen digital kø,
buzzer eller registrering av feil svar i denne fasen.

### 8.4 Avgjørelse

Når verten har bestemt utfallet:

1. verten velger laget som fikk riktig svar, eller `Ingen fikk riktig`;
2. valgt lag og poengverdi forhåndsvises tydelig;
3. handlingen gjennomføres;
4. riktig lag får rutens poengverdi;
5. leaderboard og poengsum animeres;
6. ruten markeres brukt;
7. verten kan vise fasit;
8. verten velger når spillet går tilbake til brettet.

Det trekkes foreløpig ikke poeng for feil svar. Dette må bekreftes i den videre
regeldiskusjonen.

### 8.5 Neste tur

Foreløpig forslag: valgturn går videre til neste lag i fast rundgang etter hver
avsluttede rute, uavhengig av hvilket lag som fikk poengene.

Eksempel:

```text
Lag A velger
→ Lag C svarer riktig etter utløpt tid
→ Lag C får poeng
→ Lag B velger neste rute
```

Dette forhindrer at ett lag beholder brettkontrollen gjennom mange riktige svar.
Regelen må bekreftes før implementering.

## 9. Mediaatferd

### 9.1 Felles kontroller

Lydspørsmål bruker samme kontrollmodell:

- spill;
- pause;
- fortsett;
- start på nytt;
- valgfri tilbakehopp;
- volum;
- tydelig lastestatus;
- fallback når avspilling feiler.

En enkel kontrollflate prioriteres. Fremdriftslinje kan være vertssynlig, men må
ikke vise total varighet hvis det kan gi et hint.

### 9.2 Startpunkt og klipp

Hvert lydspørsmål kan konfigurere:

- startpunkt i originalfilen;
- valgfritt sluttpunkt;
- fade-in;
- fade-out;
- anbefalt volumjustering.

Standard er å fortsette fra gjeldende posisjon når verten trykker play etter en
pause.

### 9.3 Fasit

Fasit vises bare etter vertshandling. Fasitvisningen kan inneholde:

- forventet navn;
- godkjente aliaser;
- kort forklaring av hintet;
- original sangtittel og artist når relevant;
- språk eller oversettelsesdetalj for AI-sangen;
- valgfri bonusinformasjon.

Fasit skal aldri ligge i tilgjengelig DOM før verten avslører den hvis skjermen
kan inspiseres av deltakere.

## 10. Poeng og leaderboard

Alle lag starter på null poeng.

Ved riktig svar:

- poengsummen øker med rutens verdi;
- en tydelig, kort award-animasjon starter ved laget;
- poengverdien beveger seg visuelt fra spørsmålet til laget;
- totalsummen ruller eller teller opp;
- resten av UI-et forblir lesbart;
- den nye summen lagres før verten går videre.

Ved `Ingen fikk riktig` endres ingen poeng.

Verten kan angre siste avgjørelse. Angre gjenoppretter:

- forrige poengsum;
- forrige rutestatus;
- forrige spillfase;
- forrige aktive lag når relevant.

Manuell poengjustering skal finnes i settings/vertspanelet, men ikke dominere
normal spillflyt.

## 11. Animasjon og interaksjon

Alt skal oppleves animert, men animasjonene må være regisserte og knyttet til en
spillhendelse.

### 11.1 Obligatoriske sceneoverganger

| Hendelse | Animasjonsintensjon |
| --- | --- |
| Appstart | Logo og scene bygges opp lagvis |
| Lagtrekning | Avatarer stokkes fysisk inn i lag |
| Lagnavn | Navn avsløres ett lag om gangen |
| Spillstart | Startskjerm transformeres til spillebrett |
| Ny tur | Spotlight flyttes mellom lag |
| Rutevalg | Ruten løfter seg og ekspanderer til scene |
| Bildespørsmål | Kontrollert maske eller filmatisk reveal |
| Lydspørsmål | Visualizer våkner synkront med lyd |
| Nedtelling | Økende rytme og visuell spenning |
| Tidsutløp | Scenen fryser tydelig uten å skjule media |
| Riktig svar | Poengenergi flyttes til valgt lag |
| Ingen riktig | Kort nøytral avslutning, ikke straffescene |
| Til brettet | Spørsmålet kollapser tilbake til brukt rute |
| Spillslutt | Resultatscene og vinnersekvens |

### 11.2 Interaktive flater

- ruter reagerer på peker med lys, dybde og parallax;
- klikk har fysisk pressrespons;
- aktive avatarer responderer subtilt på turendring;
- lydvisualisering reagerer på faktisk lyddata;
- timerens visuelle energi følger gjenværende tid;
- host dock glir inn uten å flytte hovedscenen;
- scorekort reagerer på poengendring, ikke kontinuerlig uten grunn.

### 11.3 Kontroll og ytelse

- verten kan hoppe til slutten av en overgang;
- interaksjon blokkeres bare mens en kritisk overgang pågår;
- gameplaytilstand oppdateres ikke av animasjonens visuelle mellomverdier;
- reduced-motion-modus beholder mening med kortere fades;
- GPU-effekter kan reduseres uten å endre spillfunksjon.

## 12. Lokal navnebank

Lagnavn lagres som lokal JSON i `src/content/team-names.json`.

Krav til navnebanken:

- gyldig JSON-array med bare strenger;
- minst 100 kandidater;
- ingen tomme navn;
- ingen eksakte duplikater;
- ingen duplikater etter trimming og normalisering av store/små bokstaver;
- lengde som fungerer på leaderboard;
- nok navn til maksimalt antall lag;
- filen valideres ved appstart og under build.

Ved lagtrekning stokker appen navnebanken og velger ett unikt navn per lag.
Navnevalget lagres med spilløkten og endres ikke ved refresh.

Før spillstart kan verten:

- trekke nye navn uten å endre lagfordelingen;
- redigere navn manuelt;
- gå tilbake til forrige navnesett.

Navnebanken er presentasjonsinnhold. Den påvirker ikke poeng, turrekkefølge
eller annen spillogikk.

## 13. Lokal lagring og gjenopptakelse

Følgende lagres etter hver meningsfulle handling:

- valgt antall lag;
- deltakerfordeling;
- godkjente lagnavn;
- lagrekkefølge og aktivt lag;
- svartidsinnstilling;
- poengsummer;
- brukte og aktive ruter;
- aktiv spillfase;
- timerstatus og deadline;
- medieposisjon når relevant;
- siste handlinger for undo.

Ved refresh tilbys `Fortsett spillet` eller `Start på nytt`. Ingen ny tilfeldig
lagfordeling eller AI-generering skjer automatisk ved gjenopptakelse.

## 14. Innholdsmodell

Konseptuell modell:

```ts
type ClueType = 'image' | 'ai-song' | 'song'

type Clue = {
  id: string
  categoryId: string
  value: 100 | 200 | 300 | 400 | 500
  type: ClueType
  answer: string
  acceptedAnswers: string[]
  explanation?: string
  media: ImageMedia | AudioMedia
  presentation?: PresentationConfig
}
```

Krav til spillpakken:

- stabile og unike ID-er;
- unik kombinasjon av kategori og poengverdi;
- kun støttede poengverdier;
- korrekt medietype for spørsmålstype;
- eksisterende lokale mediafiler;
- ikke-tomme svar;
- ingen dupliserte aktive ruter;
- alle deltakeravatarer må finnes eller ha fallback;
- nok lokale lagnavn for maksimalt antall lag.

## 15. Spillslutt

Når alle ruter er brukt, går appen direkte til vinnersekvensen.

Foreløpig finalescene:

- leaderboard sorteres animert etter poeng;
- vinnerlaget fremheves;
- alle vinneravatarer vises;
- lagnavn og sluttscore avsløres;
- celebratory scene spilles;
- verten kan velge «Se brettet» for å åpne brettet igjen.

Uavgjort og eventuell finalerunde er ikke definert ennå.

## 16. Feiltilstander

| Feil | Forventet oppførsel |
| --- | --- |
| Lyd feiler å laste | Retry, start på nytt eller hopp til svarfase |
| Bilde mangler | Nøytral placeholder og hostvarsel |
| Timer mister fokus | Beregn fra absolutt deadline, ikke frame count |
| Persistens feiler | Fortsett i minnet og varsle vert |
| Animasjon låser seg | Hopp til scenens definerte sluttilstand |
| Feil poengdeling | Angre siste avgjørelse |
| Refresh | Tilby gjenopptakelse av lagret spill |

## 17. Uavklarte regler

Følgende må avklares før spillmotoren implementeres ferdig:

1. Hvor mange kategorier skal brettet ha?
2. Skal alle kategorier alltid ha alle fem poengnivåer?
3. Skal fordelingen mellom de tre spørsmålstypene være fast eller fri?
4. Går valgturn alltid videre i fast rundgang etter hver rute?
5. Kan aktivt lag svare flere ganger innen sine 30 sekunder?
6. Skal et eksplisitt feil svar avslutte aktivt lags enerett før tiden er ute?
7. Skal feil svar noen gang gi minuspoeng?
8. Kan et lag få poeng etter å ha svart feil tidligere på samme spørsmål?
9. Når skal fasiten normalt vises: før eller etter poengdeling?
10. Skal AI-sangens språk vises automatisk eller bare som valgfritt hint?
11. Skal verten kunne spille samme lydklipp fra starten flere ganger under
    aktiv svarfase?
12. Skal vanlig sang og AI-sang fortsette automatisk etter tidsutløp?
13. Hva skjer ved uavgjort etter siste rute?
14. Skal det finnes en egen finale eller bare ordinært brett og vinnersekvens?
15. Hva er minimum og maksimum antall lag?
16. Skal lagrekkefølgen stokkes separat fra deltakerfordelingen?
17. Hvor mange angrehandlinger skal beholdes?
