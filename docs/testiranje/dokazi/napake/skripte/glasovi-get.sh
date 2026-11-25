#!/bin/bash
# EE-N05: anketa z 2 terminoma, 3 različni glasovi, nato branje ankete (share in admin) in primerjava z bazo.
B=${B:-http://localhost:3000}; DB=${DB:-postgresql://admin:admin@127.0.0.1:5433/eventeasedb}
P=$(curl -s -X POST $B/api/polls -H 'content-type: application/json' -d '{"title":"Branje glasov","organizer_email":"o@primer.si","time_slots":[{"start_time":"2026-12-20T10:00:00","end_time":"2026-12-20T11:00:00"},{"start_time":"2026-12-21T10:00:00","end_time":"2026-12-21T11:00:00"}]}')
SH=$(echo "$P" | jq -r .share_token); AD=$(echo "$P" | jq -r .admin_token)
SL=$(curl -s $B/api/polls/share/$SH | jq -r '.time_slots[].id'); S1=$(echo "$SL" | sed -n 1p); S2=$(echo "$SL" | sed -n 2p)
v(){ curl -s -o /dev/null -w "glas $1: %{http_code}\n" -X POST $B/api/polls/share/$SH/vote -H 'content-type: application/json' -d "{\"participant_name\":\"$1\",\"participant_email\":\"\",\"date_votes\":[{\"slot_id\":\"$S1\",\"status\":\"$2\"},{\"slot_id\":\"$S2\",\"status\":\"$3\"}]}"; }
v Ana yes yes; v Bojan no no; v Cene if_need_be no
echo "--- GET /share:"; curl -s -m5 -w ' [HTTP %{http_code}]\n' $B/api/polls/share/$SH | head -c 400; echo
echo "--- GET /admin:"; curl -s -m5 -o /dev/null -w '[HTTP %{http_code}]\n' $B/api/polls/admin/$AD
echo "--- baza:"; psql "$DB" -At -c "select v.participant_name, string_agg(o.status, ',' order by o.time_slot_id) from votes v join vote_options o on o.vote_id=v.id join polls p on p.id=v.poll_id where p.share_token='$SH' group by v.participant_name, v.created_at order by v.created_at"
