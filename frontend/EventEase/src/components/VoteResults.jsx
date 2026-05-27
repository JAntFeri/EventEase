import React from 'react';

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

  suggestedDates.forEach((slot) => {
    slotVoteCounts[slot.id] = 0;
    slotVoters[slot.id] = [];
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
        const percentage = Math.round((voteCount / totalUniqueParticipants) * 100) || 0;

        return (
          <div key={slot.id} className="p-4 flex items-center justify-between gap-4 bg-white">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 capitalize">
                {formatDate(slot.date)}
              </p>
              {voteCount > 0 ? (
                <p className="text-xs text-gray-500 font-light truncate mt-0.5">
                  Ustreza uporabnikom: <span className="font-medium text-gray-700">{votersList.join(', ')}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400 font-light mt-0.5">Ni oddanih glasov za ta termin</p>
              )}
            </div>

            <div className="flex items-center gap-3 w-32 justify-end shrink-0">
              <div className="w-full bg-gray-100 rounded-full h-1.5 hidden sm:block">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700 tabular-nums min-w-[36px] text-right">
                {voteCount} {getSlovenianVoteLabel(voteCount)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
