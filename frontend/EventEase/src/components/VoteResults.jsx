export default function VoteResults({ suggestedDates = [], votes = [] }) {
  if (!suggestedDates.length) {
    return (
      <p className="text-xs" style={{ color: "var(--color-text)", opacity: 0.4 }}>
        Ni razpoložljivih terminov za prikaz rezultatov.
      </p>
    );
  }

  const slotVoteCounts = {};
  const slotVoters = {};
  const slotMaybeCounts = {};
  const slotMaybeVoters = {};

  suggestedDates.forEach((slot) => {
    slotVoteCounts[slot.id] = 0;
    slotVoters[slot.id] = [];
    slotMaybeCounts[slot.id] = 0;
    slotMaybeVoters[slot.id] = [];
  });

  votes.forEach((voteRecord) => {
    const voterName = voteRecord.participant_name || "Neznanec";
    const choices = voteRecord.choices || voteRecord.date_votes || [];
    choices.forEach((choice) => {
      if (choice.status === "yes") {
        slotVoteCounts[choice.slot_id] = (slotVoteCounts[choice.slot_id] || 0) + 1;
        if (!slotVoters[choice.slot_id]) slotVoters[choice.slot_id] = [];
        slotVoters[choice.slot_id].push(voterName);
      }
      if (choice.status === "if_need_be" || choice.status === "if_needed") {
        slotMaybeCounts[choice.slot_id] = (slotMaybeCounts[choice.slot_id] || 0) + 1;
        if (!slotMaybeVoters[choice.slot_id]) slotMaybeVoters[choice.slot_id] = [];
        slotMaybeVoters[choice.slot_id].push(voterName);
      }
    });
  });

  const totalUniqueParticipants = votes.length || 1;

  const getSlovenianVoteLabel = (count) => {
    const mod100 = count % 100;
    if (mod100 === 1) return "glas";
    if (mod100 === 2) return "glasa";
    if (mod100 === 3 || mod100 === 4) return "glasovi";
    return "glasov";
  };

  const formatDate = (slot) => {
    const raw = slot.start_time || slot.date;
    if (!raw) return "";
    return new Date(raw).toLocaleDateString("sl-SI", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (slot) => {
    if (!slot.start_time || !slot.start_time.includes("T")) return null;
    const time = slot.start_time.split("T")[1]?.slice(0, 5);
    return time && time !== "00:00" ? time : null;
  };

  const noVotesCast = votes.length === 0;

  return (
    <div
      className="rounded-xl overflow-hidden divide-y"
      style={{
        border: "1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)",
        divideColor: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
      }}
    >
      {suggestedDates.map((slot) => {
        const voteCount = slotVoteCounts[slot.id] || 0;
        const votersList = slotVoters[slot.id] || [];
        const maybeCount = slotMaybeCounts[slot.id] || 0;
        const maybeVotersList = slotMaybeVoters[slot.id] || [];
        const yesPercentage = Math.round((voteCount / totalUniqueParticipants) * 100) || 0;
        const maybePercentage = Math.round((maybeCount / totalUniqueParticipants) * 100) || 0;
        const time = formatTime(slot);

        return (
          <div
            key={slot.id}
            className="px-4 py-3.5 flex items-center justify-between gap-4"
            style={{ backgroundColor: "var(--color-bg)" }}
          >
            {/* Left: date + voter names */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <p
                  className="text-sm font-medium capitalize"
                  style={{ color: "var(--color-text)" }}
                >
                  {formatDate(slot)}
                </p>
                {time && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-primary)", opacity: 0.6 }}
                  >
                    {time}
                  </span>
                )}
              </div>

              {noVotesCast ? (
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text)", opacity: 0.35 }}>
                  Še ni glasov
                </p>
              ) : (
                <div className="mt-0.5 space-y-0.5">
                  {votersList.length > 0 && (
                    <p className="text-xs truncate" style={{ color: "var(--color-text)", opacity: 0.55 }}>
                      Ustreza:{" "}
                      <span style={{ color: "var(--color-text)", opacity: 1, fontWeight: 500 }}>
                        {votersList.join(", ")}
                      </span>
                    </p>
                  )}
                  {maybeVotersList.length > 0 && (
                    <p className="text-xs truncate" style={{ color: "var(--color-text)", opacity: 0.45 }}>
                      Če bo potrebno:{" "}
                      <span style={{ fontWeight: 500 }}>{maybeVotersList.join(", ")}</span>
                    </p>
                  )}
                  {votersList.length === 0 && maybeVotersList.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--color-text)", opacity: 0.3 }}>
                      Ni glasov za ta termin
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right: progress bars + counts — hidden when no votes */}
            {!noVotesCast && (
              <div className="w-36 shrink-0 space-y-1.5">
                {/* Yes bar */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 rounded-full h-1 hidden sm:block"
                    style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}
                  >
                    <div
                      className="h-1 rounded-full transition-all duration-500"
                      style={{
                        width: `${yesPercentage}%`,
                        backgroundColor: "var(--color-primary)",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs tabular-nums text-right"
                    style={{
                      color: "var(--color-text)",
                      opacity: voteCount > 0 ? 0.8 : 0.35,
                      minWidth: "52px",
                      fontWeight: voteCount > 0 ? 500 : 400,
                    }}
                  >
                    {voteCount} {getSlovenianVoteLabel(voteCount)}
                  </span>
                </div>

                {/* Maybe bar — accent-2 as a thin progress fill, one of its few uses */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 rounded-full h-1 hidden sm:block"
                    style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}
                  >
                    <div
                      className="h-1 rounded-full transition-all duration-500"
                      style={{
                        width: `${maybePercentage}%`,
                        backgroundColor: "var(--color-accent-2)",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs tabular-nums text-right"
                    style={{
                      color: "var(--color-text)",
                      opacity: maybeCount > 0 ? 0.6 : 0.3,
                      minWidth: "52px",
                    }}
                  >
                    {maybeCount} {getSlovenianVoteLabel(maybeCount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}