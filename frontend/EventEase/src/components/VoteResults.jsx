
export default function VoteResults({ suggestedDates = [], votes = [] }) {
  if (!votes.length) {
    return (
      <div className="text-xs text-gray-500 font-light">
        Trenutno se ni oddanih glasov za prikaz.
      </div>
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
    const voterName = voteRecord.participant_name || 'Neznanec';
    const choices = voteRecord.choices || voteRecord.date_votes || [];

    choices.forEach((choice) => {
      if (choice.status === 'yes') {
        slotVoteCounts[choice.slot_id] = (slotVoteCounts[choice.slot_id] || 0) + 1;
        if (!slotVoters[choice.slot_id]) slotVoters[choice.slot_id] = [];
        slotVoters[choice.slot_id].push(voterName);
      }

      if (choice.status === 'if_need_be' || choice.status === 'if_needed') {
        slotMaybeCounts[choice.slot_id] = (slotMaybeCounts[choice.slot_id] || 0) + 1;
        if (!slotMaybeVoters[choice.slot_id]) slotMaybeVoters[choice.slot_id] = [];
        slotMaybeVoters[choice.slot_id].push(voterName);
      }
    });
  });

  const totalUniqueParticipants = votes.length || 1;

  const getSlovenianVoteLabel = (count) => {
    if (count === 0) return 'glasov';
    const mod100 = count % 100;
    if (mod100 === 1) return 'glas';
    if (mod100 === 2) return 'glasa';
    if (mod100 === 3 || mod100 === 4) return 'glasi';
    return 'glasov';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('sl-SI', options);
  };

  if (!suggestedDates.length) {
    return (
      <div className="text-xs text-gray-500 font-light">
        Ni razpolozljivih terminov za prikaz rezultatov.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
      {suggestedDates.map((slot) => {
        const voteCount = slotVoteCounts[slot.id] || 0;
        const votersList = slotVoters[slot.id] || [];
        const maybeCount = slotMaybeCounts[slot.id] || 0;
        const maybeVotersList = slotMaybeVoters[slot.id] || [];
        const yesPercentage = Math.round((voteCount / totalUniqueParticipants) * 100) || 0;
        const maybePercentage = Math.round((maybeCount / totalUniqueParticipants) * 100) || 0;

        return (
          <div key={slot.id} className="p-4 flex items-center justify-between gap-4 bg-white">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 capitalize">
                {formatDate(slot.date)}
              </p>
              {(voteCount > 0 || maybeCount > 0) ? (
                <div className="text-xs text-gray-500 font-light mt-0.5 space-y-1">
                  {voteCount > 0 && (
                    <p className="truncate">
                      Ustreza uporabnikom: <span className="font-medium text-gray-700">{votersList.join(', ')}</span>
                    </p>
                  )}
                  {maybeCount > 0 && (
                    <p className="truncate">
                      Ce bo potrebno: <span className="font-medium text-gray-700">{maybeVotersList.join(', ')}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-light mt-0.5">Ni oddanih glasov za ta termin</p>
              )}
            </div>

            <div className="w-40 shrink-0 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${yesPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 tabular-nums text-right min-w-[56px]">
                  {voteCount} {getSlovenianVoteLabel(voteCount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                  <div
                    className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${maybePercentage}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 tabular-nums text-right min-w-[56px]">
                  {maybeCount} {getSlovenianVoteLabel(maybeCount)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
