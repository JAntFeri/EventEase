#!/bin/bash
# EE-N06: N vzporednih potrditev iste ankete, vsaka z drugim terminom; R ponovitev.
# Pričakovano: natanko en HTTP 200, ostali 409.
B=${B:-http://localhost:3000}; R=${1:-5}; N=${2:-10}
for rep in $(seq $R); do
  slots=$(for d in $(seq 10 $((9+N))); do printf '{"start_time":"2026-12-%02dT10:00:00","end_time":"2026-12-%02dT11:00:00"},' $d $d; done); slots="[${slots%,}]"
  P=$(curl -s -m5 -X POST $B/api/polls -H 'content-type: application/json' -d "{\"title\":\"Potrditev $rep\",\"organizer_email\":\"o$rep@primer.si\",\"time_slots\":$slots}") || { echo "ponovitev $rep: strežnik ne odgovarja"; continue; }
  SH=$(echo "$P" | jq -r .share_token); AD=$(echo "$P" | jq -r .admin_token)
  mapfile -t IDS < <(curl -s $B/api/polls/share/$SH | jq -r '.time_slots[].id')
  codes=$(for id in "${IDS[@]}"; do curl -s -m10 -o /dev/null -w '%{http_code}\n' -X POST $B/api/polls/admin/$AD/finalize -H 'content-type: application/json' -d "{\"final_slot_id\":\"$id\"}" & done; wait)
  echo "ponovitev $rep: $(echo "$codes" | sort | uniq -c | tr -s ' ' | tr '\n' ';')"
done
