#!/usr/bin/env bash
# API smoke test — run against a live EventEase instance (e.g. docker compose up).
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
POLL_TITLE="CI Smoke Test $(date +%s)"

echo "→ Smoke test against ${BASE_URL}"

CREATE_RESPONSE="$(curl -sf -X POST "${BASE_URL}/api/polls" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"${POLL_TITLE}\",
    \"description\": \"Automated smoke test\",
    \"organizer_email\": \"ci@eventease.test\",
    \"time_slots\": [
      {
        \"start_time\": \"2026-06-15T12:00:00\",
        \"end_time\": \"2026-06-15T13:00:00\"
      }
    ]
  }")"

SHARE_TOKEN="$(echo "${CREATE_RESPONSE}" | jq -re '.share_token')"
ADMIN_TOKEN="$(echo "${CREATE_RESPONSE}" | jq -re '.admin_token')"
SLOT_ID="$(curl -sf "${BASE_URL}/api/polls/share/${SHARE_TOKEN}" | jq -re '.time_slots[0].id')"

echo "→ Poll created (share_token=${SHARE_TOKEN})"

curl -sf "${BASE_URL}/api/polls/share/${SHARE_TOKEN}" \
  | jq -e --arg title "${POLL_TITLE}" '.title == $title' >/dev/null

echo "→ GET poll OK"

curl -sf -X POST "${BASE_URL}/api/polls/share/${SHARE_TOKEN}/vote" \
  -H "Content-Type: application/json" \
  -d "{
    \"participant_name\": \"CI Tester\",
    \"date_votes\": [{ \"slot_id\": \"${SLOT_ID}\", \"status\": \"yes\" }]
  }" \
  | jq -e '.success == true' >/dev/null

echo "→ POST vote OK"

curl -sf -X POST "${BASE_URL}/api/polls/admin/${ADMIN_TOKEN}/finalize" \
  -H "Content-Type: application/json" \
  -d "{ \"final_slot_id\": \"${SLOT_ID}\" }" \
  | jq -e '.success == true' >/dev/null

echo "→ POST finalize OK"

FINALIZED="$(curl -sf "${BASE_URL}/api/polls/share/${SHARE_TOKEN}" | jq -re '.is_finalized')"
if [[ "${FINALIZED}" != "true" ]]; then
  echo "ERROR: poll should be finalized" >&2
  exit 1
fi

echo "→ Smoke test passed"
