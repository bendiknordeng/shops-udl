#!/usr/bin/env bash
#
# Last ned og klipp ut et kort lydutsnitt til en spørsmålsrute.
#
# Bruk:
#   scripts/add-song-clip.sh <rute-id> <start> <slutt> <url-eller-søk>
#
# Eksempler:
#   scripts/add-song-clip.sh k5-300 56 72 "https://www.youtube.com/watch?v=UGL_OL3OrCE"
#   scripts/add-song-clip.sh k1-200 55 71 "Low Flo Rida"
#
# <start>/<slutt> kan være sekunder (56) eller mm:ss (0:56).
# Er siste argument ikke en URL, søkes det opp automatisk (første treff).
#
# Resultat: public/media/audio/<rute-id>.mp3  (nøytralt filnavn — røper ikke svaret)
# Husk å peke media.src i src/content/game-pack.ts til den nye fila.
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Bruk: $0 <rute-id> <start> <slutt> <url-eller-søk>" >&2
  echo 'Eksempel: '"$0"' k5-300 56 72 "Low Flo Rida"' >&2
  exit 1
fi

ID="$1"
START="$2"
END="$3"
SRC="$4"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/media/audio"
mkdir -p "$DEST"

# URL eller søkestreng?
if [[ "$SRC" == http* ]]; then
  QUERY="$SRC"
else
  QUERY="ytsearch1:$SRC"
fi

echo "Laster ned og klipper $START-$END -> $DEST/$ID.mp3"

# Fjern evt. gammel fil med samme navn (annen endelse)
rm -f "$DEST/$ID."*

yt-dlp \
  -x --audio-format mp3 --audio-quality 0 \
  --download-sections "*${START}-${END}" \
  --force-keyframes-at-cuts \
  -o "$DEST/${ID}.%(ext)s" \
  "$QUERY"

echo ""
echo "✅ Ferdig: public/media/audio/${ID}.mp3"
echo "   Sett i game-pack.ts:  media: { kind: 'audio', src: '/media/audio/${ID}.mp3', fadeInMs: 400, fadeOutMs: 600 }"
