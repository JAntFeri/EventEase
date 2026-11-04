#!/usr/bin/env bash
# Zaganjalnik sistemskih testov EventEase (k6).
#
#   tests/system/zazeni.sh obremenitveni|stresni
#
# Predpogoj: aplikacija teče (docker compose, glej docs/testiranje/Sistemsko_testiranje.md, pogl. 3).
# Okolje:   BASE_URL (privzeto http://localhost:8080)
#           TEST_DATABASE_URL (privzeto postgresql://admin:admin@127.0.0.1:5433/eventeasedb)
#           K6 (pot do k6; privzeto `k6` iz PATH, sicer Docker slika grafana/k6)
#
# Dokazi:  docs/testiranje/dokazi/sistemski/<tip>/   (povzetki, grafi, HTML poročilo k6)
# Surovo:  tests/system/surovo/<RUN_ID>/            (surove meritve k6, niso v gitu)
set -euo pipefail

TIP="${1:?uporaba: zazeni.sh obremenitveni|stresni}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:8080}"
DB="${TEST_DATABASE_URL:-postgresql://admin:admin@127.0.0.1:5433/eventeasedb}"
RUN_ID="${TIP}-$(date +%Y%m%dT%H%M%S)"
OUT="$ROOT/docs/testiranje/dokazi/sistemski/$TIP"
RAW="$ROOT/tests/system/surovo/$RUN_ID"
mkdir -p "$OUT" "$RAW"

if [[ -n "${K6:-}" ]]; then K6_CMD=("$K6")
elif command -v k6 >/dev/null; then K6_CMD=(k6)
else K6_CMD=(docker run --rm -i --network host -u "$(id -u)" -v "$ROOT:$ROOT" -w "$ROOT" grafana/k6)
fi

pg_stat() {
  psql "$DB" -At -F, -c "SELECT xact_commit, xact_rollback, deadlocks FROM pg_stat_database WHERE datname = current_database()"
}

echo "→ $RUN_ID proti $BASE_URL"
curl -sf -o /dev/null "$BASE_URL/" || { echo "aplikacija ne odgovarja na $BASE_URL" >&2; exit 1; }
PG_PRED="$(pg_stat)"

python3 "$ROOT/tests/system/spremljaj_vire.py" "$RAW/viri.csv" &
MON=$!
trap 'kill $MON 2>/dev/null || true' EXIT
sleep 3 # izhodiščne meritve virov pred obremenitvijo

ZACETEK=$(date +%s)
set +e
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT="$OUT/k6_porocilo.html" \
  "${K6_CMD[@]}" run \
  -e BASE_URL="$BASE_URL" -e RUN_ID="$RUN_ID" ${K6_DODATNO:-} \
  --out "csv=$RAW/k6_meritve.csv.gz" \
  --summary-export "$OUT/k6_povzetek.json" \
  "$ROOT/tests/system/k6/$TIP.js" 2>&1 \
  | grep --line-buffered -vE '^running \(|level=warning msg="Request Failed"' | tee "$OUT/k6_izpis.txt"
K6_IZHOD=${PIPESTATUS[0]}
set -e
KONEC=$(date +%s)

sleep 5 # meritve virov po obremenitvi
kill $MON; wait $MON 2>/dev/null || true
PG_PO="$(pg_stat)"

# Stanje v bazi za ankete tega zagona (preverjanje celovitosti podatkov).
BAZA="$(psql "$DB" -At -F, -c "
  SELECT
    (SELECT count(*) FROM polls WHERE title LIKE 'k6-${RUN_ID}-%'),
    (SELECT count(*) FROM polls WHERE title LIKE 'k6-${RUN_ID}-%' AND is_finalized),
    (SELECT count(*) FROM votes v JOIN polls p ON p.id = v.poll_id WHERE p.title LIKE 'k6-${RUN_ID}-%'),
    (SELECT count(*) FROM slot_suggestions s JOIN polls p ON p.id = s.poll_id WHERE p.title LIKE 'k6-${RUN_ID}-%'),
    (SELECT count(*) FROM votes v JOIN polls p ON p.id = v.poll_id
       WHERE p.title LIKE 'k6-${RUN_ID}-%'
         AND NOT EXISTS (SELECT 1 FROM vote_options o WHERE o.vote_id = v.id))")"

cat > "$OUT/zagon.json" <<EOF
{
  "run_id": "$RUN_ID",
  "base_url": "$BASE_URL",
  "zacetek": $ZACETEK,
  "konec": $KONEC,
  "k6_izhodna_koda": $K6_IZHOD,
  "k6_verzija": "$("${K6_CMD[@]}" version | head -1)",
  "git": "$(git -C "$ROOT" rev-parse --short HEAD)",
  "pg_pred": "$PG_PRED",
  "pg_po": "$PG_PO",
  "baza": "$BAZA"
}
EOF

python3 "$ROOT/tests/system/analiza.py" "$TIP" "$OUT" "$RAW"
echo "→ k6 izhodna koda: $K6_IZHOD (99 = neizpolnjen prag)"
