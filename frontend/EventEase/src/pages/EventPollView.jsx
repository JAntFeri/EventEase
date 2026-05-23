import React, { useState } from 'react';

const defaultSampleEvent = {
  id: "sample-123",
  title: "Sestanek študentskega društva",
  description: "Usmerjevalni sestanek glede organizacije majskih iger. Prinesite osnutke proračunov!",
  suggestedDates: ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"],
  votes: {
    "2026-06-01": ["Anže", "Tina", "Jan", "Luka"], 
    "2026-06-02": ["Tina", "Maja", "Luka"],       
    "2026-06-03": ["Anže"],                        
    "2026-06-04": []                               
  }
};

export default function EventPollView({ 
  eventData = defaultSampleEvent, 
  onVoteSubmit = (date) => console.log("Selected date for submission:", date),
  onBack = () => console.log("Navigating back...") 
}) {
  const [selectedDate, setSelectedDate] = useState(null);
  const activeVotes = eventData.votes || {};

  const allVoters = new Set(Object.values(activeVotes).flat());
  const totalParticipants = allVoters.size || 1;

  const handleDateChange = (dateString) => {
    setSelectedDate(dateString);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate) return alert('Izberite datum, ki vam ustreza.');
    
    onVoteSubmit(selectedDate);
  };

  const getSlovenianVoteLabel = (count) => {
    if (count === 0) return 'glasov';
    const mod100 = count % 100;
    if (mod100 === 1) return 'glas';
    if (mod100 === 2) return 'glasa';
    if (mod100 === 3 || mod100 === 4) return 'glasi';
    return 'glasov';
  };

  const formatDate = (dateStr) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('sl-SI', options);
  };

  return (
    <div className="py-12 md:py-16 px-4 max-w-2xl mx-auto">
      {/* Event Header */}
      <div className="mb-8 border-b border-gray-100 pb-6">
        <button 
          onClick={onBack} 
          className="text-xs text-gray-500 hover:text-black mb-4 flex items-center gap-1 transition"
        >
          ← Nazaj na vabilo
        </button>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Glasovanje za termin</span>
        <h1 className="font-serif text-3xl font-normal text-gray-900 mb-2">{eventData.title}</h1>
        {eventData.description && (
          <p className="text-sm text-gray-600 font-light mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
            {eventData.description}
          </p>
        )}
      </div>

      {/* Interactive Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
          Izberite najboljši datum:
        </label>

        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
          {eventData.suggestedDates.map((dateStr) => {
            const currentVotesForDate = activeVotes[dateStr] || [];
            const voteCount = currentVotesForDate.length;
            const percentage = Math.round((voteCount / totalParticipants) * 100) || 0;
            // Strict comparison check for single item selection
            const isChecked = selectedDate === dateStr;

            return (
              <div 
                key={dateStr} 
                className={`p-4 flex items-center justify-between gap-4 transition-colors ${isChecked ? 'bg-gray-50/60' : 'bg-white'}`}
              >
                {/* Left: Radio Button & Date Info */}
                <label className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0">
                  <input 
                    type="radio" 
                    name="event-date-poll" // Shared name attribute group ensures native single selection
                    className="w-5 h-5 border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                    checked={isChecked}
                    onChange={() => handleDateChange(dateStr)}
                  />
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 capitalize">{formatDate(dateStr)}</p>
                    {voteCount > 0 ? (
                      <p className="text-xs text-gray-500 font-light truncate mt-0.5">
                        Glasovali: {currentVotesForDate.join(', ')}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 font-light mt-0.5">Ni še glasov</p>
                    )}
                  </div>
                </label>

                {/* Right: Visual Progress Tracking */}
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

        {/* Submit Action */}
        <div className="pt-2">
          <button 
            type="submit" 
            className="w-full text-sm text-white font-medium bg-black py-3 px-5 rounded-md hover:bg-gray-800 active:scale-95 transition shadow-sm"
          >
            Oddaj svoj glas
          </button>
        </div>
      </form>
    </div>
  );
}