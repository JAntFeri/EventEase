// "if_needed" je starejše ime statusa, ki ga lahko še vedno najdemo v podatkih.
const MAYBE_STATUSES = new Set(["if_need_be", "if_needed"]);

export function tallyVotes(slots, votes) {
  const tally = {};
  for (const slot of slots || []) tally[slot.id] = { yes: [], maybe: [] };

  for (const voteRecord of votes || []) {
    const voterName = voteRecord.participant_name || "Neznanec";
    const choices = voteRecord.choices || voteRecord.date_votes || [];
    for (const choice of choices) {
      const entry = tally[choice.slot_id];
      if (!entry) continue;
      if (choice.status === "yes") entry.yes.push(voterName);
      else if (MAYBE_STATUSES.has(choice.status)) entry.maybe.push(voterName);
    }
  }
  return tally;
}

export function votePercentage(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

// Slovenska sklanjatev: 1 glas, 2 glasova, 3–4 glasovi, 5+ glasov (ponovi se na vsakih 100).
export function voteLabel(count) {
  const mod100 = count % 100;
  if (mod100 === 1) return "glas";
  if (mod100 === 2) return "glasova";
  if (mod100 === 3 || mod100 === 4) return "glasovi";
  return "glasov";
}
