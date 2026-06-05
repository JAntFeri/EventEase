#!/bin/bash
set -euo pipefail

echo "=== Testing cleanup ==="

# 1. Create poll with a slot in the past (>7 days ago)
RESP=$(curl -s --max-time 5 -X POST http://localhost:3000/api/polls \
  -H 'Content-Type: application/json' \
  -d '{"title":"cleanup test","organizer_email":"admin@test.com","time_slots":[{"start_time":"2026-05-01T10:00:00Z","end_time":"2026-05-01T11:00:00Z"}]}')
SHARE_TOKEN=$(echo "$RESP" | jq -r '.share_token')
ADMIN_TOKEN=$(echo "$RESP" | jq -r '.admin_token')
echo "Created poll with share token: $SHARE_TOKEN"

# 2. Get slot ID
POLL=$(curl -s --max-time 5 "http://localhost:3000/api/polls/share/$SHARE_TOKEN")
SLOT_ID=$(echo "$POLL" | jq -r '.time_slots[0].id')

# 3. Submit a vote (required? not required for finalize, but let's do it)
curl -s -X POST "http://localhost:3000/api/polls/share/$SHARE_TOKEN/vote" \
  -H 'Content-Type: application/json' \
  -d "{\"participant_name\":\"Test\",\"participant_email\":\"test@test.com\",\"date_votes\":[{\"slot_id\":\"$SLOT_ID\",\"status\":\"yes\"}]}" > /dev/null

# 4. Finalize the poll
curl -s -X POST "http://localhost:3000/api/polls/admin/$ADMIN_TOKEN/finalize" \
  -H 'Content-Type: application/json' \
  -d "{\"final_slot_id\":\"$SLOT_ID\"}" > /dev/null

echo "Poll finalized. Waiting for cleanup cycle..."
sleep 15  # wait for cleanup (interval = 10 seconds)

# 5. Check if poll still exists
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/polls/share/$SHARE_TOKEN")
if [ "$HTTP_CODE" = "404" ]; then
  echo "✅ Poll successfully deleted by cleanup."
else
  echo "❌ Poll still exists (HTTP $HTTP_CODE). Cleanup may not have run."
fi
