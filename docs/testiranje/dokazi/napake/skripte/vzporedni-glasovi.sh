#!/bin/bash
# EE-N01, EE-N03: K anket z različnimi organizatorji, v vsako hkrati 1 glas.
# Preveri, ali je vsak organizator dobil SVOJE obvestilo in ali strežnik preživi.
B=${B:-http://localhost:3000}; K=${1:-10}; OUT=${2:?mapa z zajeto e-pošto}; rm -f "$OUT"/*
declare -a SH SL
for i in $(seq $K); do
  P=$(curl -s -m5 -X POST $B/api/polls -H 'content-type: application/json' -d "{\"title\":\"Anketa $i\",\"organizer_email\":\"org$i@primer.si\",\"time_slots\":[{\"start_time\":\"2026-12-10T10:00:00\",\"end_time\":\"2026-12-10T11:00:00\"}]}") || { echo "ustvarjanje ni uspelo (strežnik ne odgovarja)"; exit 1; }
  SH[$i]=$(echo "$P" | jq -r .share_token); SL[$i]=$(curl -s $B/api/polls/share/${SH[$i]} | jq -r '.time_slots[0].id')
done
codes=$(for i in $(seq $K); do curl -s -m10 -o /dev/null -w '%{http_code}\n' -X POST $B/api/polls/share/${SH[$i]}/vote -H 'content-type: application/json' -d "{\"participant_name\":\"Glasovalec $i\",\"participant_email\":\"\",\"date_votes\":[{\"slot_id\":\"${SL[$i]}\",\"status\":\"yes\"}]}" & done; wait)
echo "odzivi: $(echo "$codes" | sort | uniq -c | tr -s ' ' | tr '\n' ';')"
ok=0; for i in $(seq $K); do n=$(cat "$OUT"/* 2>/dev/null | jq -r "select(.to[0]==\"org$i@primer.si\") | .subject" 2>/dev/null | grep -cx "New vote in poll: Anketa $i"); [ "$n" = 1 ] && ok=$((ok+1)); done
bad=0; for f in "$OUT"/*; do [ -e "$f" ] && { jq -e . "$f" >/dev/null 2>&1 || bad=$((bad+1)); }; done
echo "zajetih e-pošt: $(ls "$OUT" | wc -l), organizatorjev s pravilnim obvestilom: $ok/$K, pokvarjenih JSON: $bad"
echo "prejemniki: $(cat "$OUT"/* 2>/dev/null | jq -r '.to[0]' 2>/dev/null | sort | uniq -c | tr -s ' ' | tr '\n' ';')"
