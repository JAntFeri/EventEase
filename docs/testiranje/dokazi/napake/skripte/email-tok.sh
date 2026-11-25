#!/bin/bash
# EE-N04, EE-N07, EE-N08, EE-N09: celoten potek z zajemom e-pošte (lažni curl). Izpiše vsebino vseh sporočil in .ics.
B=${B:-http://localhost:3000}; OUT=${1:?mapa z zajeto e-pošto}; rm -f "$OUT"/*
P=$(curl -s -X POST $B/api/polls -H 'content-type: application/json' -d '{"title":"Sestanek ekipe","organizer_email":"organizator@primer.si","time_slots":[{"start_time":"2026-12-10T18:00:00","end_time":"2026-12-10T19:00:00"}]}')
SH=$(echo "$P" | jq -r .share_token); AD=$(echo "$P" | jq -r .admin_token); S1=$(curl -s $B/api/polls/share/$SH | jq -r '.time_slots[0].id')
curl -s -o /dev/null -w "glas Ana: %{http_code}\n" -X POST $B/api/polls/share/$SH/vote -H 'content-type: application/json' -d "{\"participant_name\":\"Ana\",\"participant_email\":\"ana@primer.si\",\"date_votes\":[{\"slot_id\":\"$S1\",\"status\":\"yes\"}]}"
curl -s -o /dev/null -w "glas Bojan (brez e-pošte): %{http_code}\n" -X POST $B/api/polls/share/$SH/vote -H 'content-type: application/json' -d "{\"participant_name\":\"Bojan\",\"participant_email\":\"\",\"date_votes\":[{\"slot_id\":\"$S1\",\"status\":\"yes\"}]}"
curl -s -w " potrditev: %{http_code}\n" -X POST $B/api/polls/admin/$AD/finalize -H 'content-type: application/json' -d "{\"final_slot_id\":\"$S1\"}"
echo "termin v API: $(curl -s $B/api/polls/share/$SH | jq -c '.time_slots[0]|[.start_time,.end_time]')  (izbrano v vmesniku: 10. 12. 2026 ob 18:00)"
for f in $(ls "$OUT"/* | sort); do
  echo; echo "=== ZA: $(jq -r '.to[0]' $f) | ZADEVA: $(jq -r .subject $f)"
  jq -r '.text // (.html | gsub("<br>"; "\n") | gsub("<[^>]*>"; "") | gsub("&mdash;"; "—"))' $f | sed '/^\s*$/d'
  jq -r '.attachments[]?.content' $f | base64 -d 2>/dev/null | tr -d '\r' | sed 's/^/  ics| /'
done
echo; echo "DTSTART 20261210T180000Z v Ljubljani: $(TZ=Europe/Ljubljana date -d 2026-12-10T18:00:00Z '+%d. %m. %Y %H:%M')"
