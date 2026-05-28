// src/pages/InviteView.jsx
import React, { useState } from 'react';
import CalendarPicker from '../components/CalendarPicker';
import VoteResults from '../components/VoteResults';

export default function InviteView({ eventData }) {
  const [guestName, setGuestName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false); // Track submission state inline
  
  // State maps "YYYY-MM-DD" to vote status: { "2026-05-13": "yes" | "if_needed" }
  const [dateVotes, setDateVotes] = useState({}); 
  const [claimedTasks, setClaimedTasks] = useState([]);
  const [showNoDatePopup, setShowNoDatePopup] = useState(false);

  const { title, description, suggestedDates, tasks, organizerName, share_token, votes = [] } = eventData;
  const [resultsVisible, setResultsVisible] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const [resultsData, setResultsData] = useState(() => ({
    suggestedDates: suggestedDates || [],
    votes
  }));

  const toggleTask = (taskName) => {
    setClaimedTasks(prev => prev.includes(taskName) ? prev.filter(t => t !== taskName) : [...prev, taskName]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return alert('Vpišite ime.');
    
    // Check if at least one date is marked yes/if_needed
    const selectedDates = Object.keys(dateVotes).filter(dateStr => dateVotes[dateStr]);
    if (selectedDates.length === 0) return setShowNoDatePopup(true);

    // Map backend array options cleanly to database slot IDs
    const formattedVotes = suggestedDates.map(slot => ({
      slot_id: slot.id, 
      status: dateVotes[slot.date] === 'if_needed'
        ? 'if_need_be'
        : (dateVotes[slot.date] === 'yes' ? 'yes' : 'no')
    }));

    try {
      // POST payload hits /api/polls/share/{share_token}/vote
      const response = await fetch(`/api/polls/share/${share_token}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_name: guestName.trim(),
          date_votes: formattedVotes,   
          claimed_tasks: claimedTasks   
        })
      });
      
      if (response.ok) {
        setIsSubmitted(true); // Switch to the inline Thank You screen!
      } else {
        alert('Napaka pri oddaji glasu na strežniku.');
      }
    } catch (error) {
      console.error("Napaka pri oddaji glasu:", error);
    }
  };

  const fetchResults = async () => {
    try {
      setResultsError('');
      setResultsLoading(true);
      const response = await fetch(`/api/polls/share/${share_token}`);

      if (!response.ok) {
        throw new Error('Rezultatov ni mogoče pridobiti. Poskusite znova.');
      }

      const data = await response.json();
      const formattedSlots = (data.time_slots || []).map(slot => {
        if (!slot.start_time) return null;
        const cleanDate = slot.start_time.replace('T', ' ').split(' ')[0];
        return {
          id: slot.id,
          date: cleanDate
        };
      }).filter(Boolean);

      if (!Array.isArray(data.votes)) {
        setResultsError('Backend ne vraca glasov. Preverite API odgovor.');
      }

      setResultsData({
        suggestedDates: formattedSlots,
        votes: Array.isArray(data.votes) ? data.votes : []
      });
    } catch (error) {
      setResultsError(error.message || 'Napaka pri nalaganju rezultatov.');
    } finally {
      setResultsLoading(false);
    }
  };

  const handleToggleResults = async () => {
    if (resultsVisible) {
      setResultsVisible(false);
      return;
    }

    setResultsVisible(true);
    await fetchResults();
  };

  // 1. CONDITIONAL COMPONENT: Render this "Hvala" section if submitted successfully
  if (isSubmitted) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] text-center px-4 bg-white max-w-xl mx-auto py-12">
        <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-5 text-xl font-bold">
          ✓
        </div>
        <h1 className="font-serif text-3xl font-normal text-gray-950 mb-3">
          Hvala, {guestName}!
        </h1>
        <p className="text-sm text-gray-600 max-w-sm font-light leading-relaxed mb-6">
          Vaša prisotnost in izbrani termini za dogodek <span className="font-medium text-gray-900">"{title}"</span> so uspešno zabeleženi. Ko organizator zaključi glasovanje, boste prejeli obvestilo.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleToggleResults}
            className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-md shadow-sm transition"
          >
            {resultsVisible ? 'Skrij rezultate glasovanja' : 'Prikazi trenutne rezultate glasovanja'}
          </button>
          <button 
            onClick={() => setIsSubmitted(false)} 
            className="text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-900 px-4 py-2 rounded-md transition"
          >
            Spremeni moje odgovore
          </button>
        </div>
        {resultsVisible && (
          <div className="w-full mt-6">
            {resultsLoading && (
              <p className="text-xs text-gray-500 font-light">Nalagam rezultate...</p>
            )}
            {!resultsLoading && resultsError && (
              <p className="text-xs text-red-500 font-light">{resultsError}</p>
            )}
            {!resultsLoading && !resultsError && (
              <VoteResults
                suggestedDates={resultsData.suggestedDates}
                votes={resultsData.votes}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // Pure clean strings array for the calendar picker rendering: ["2026-05-13", "2026-05-14", ...]
  const plainDisplayDates = suggestedDates.map(slot => slot.date);

  // 2. STANDARD RENDERING: Render the invitation poll form
  return (
    <div className="py-12 md:py-16 px-4 max-w-xl mx-auto">
      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 py-1 px-2.5 rounded-full mb-4">
        {organizerName || "Organizator"} vas vabi!
      </span>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-normal text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 font-light leading-relaxed">{description || 'Ni opisa.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Tvoje ime</label>
          <input type="text" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="Vpiši svoje ime..." value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Kateri termini ti ustrezajo?</label>
          <CalendarPicker
            dateStatuses={dateVotes}
            onDateStatusesChange={setDateVotes}
            isPollMode={true}
            allowedDates={plainDisplayDates} 
          />
        </div>

        {tasks && tasks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Pomoč pri organizaciji (izbirno)</label>
            <div className="flex flex-col gap-2 mt-1">
              {tasks.map(task => {
                const isClaimed = claimedTasks.includes(task);
                return (
                  <div key={task} className={`flex items-center justify-between p-4 border rounded-xl transition duration-150 ${isClaimed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${isClaimed ? 'line-through opacity-70' : ''}`}>{task}</span>
                      <span className="text-xs opacity-60 mt-0.5">{isClaimed ? `Prevzel/a: ${guestName}` : 'Na voljo'}</span>
                    </div>
                    <button type="button" className={`text-xs font-medium py-1.5 px-3 rounded transition ${isClaimed ? 'bg-emerald-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'}`} onClick={() => toggleTask(task)}>
                      {isClaimed ? 'Izpusti' : 'Prevzemi'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button type="submit" className="w-full text-sm text-white font-medium bg-black py-3 px-5 rounded-md hover:bg-gray-800 active:scale-95 transition shadow-sm">Potrdi udeležbo</button>
      </form>

      {showNoDatePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Izberite termin</h2>
            <p className="text-sm text-gray-600">Pred potrditvijo udeležbe izberite vsaj en datum.</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="text-sm text-white font-medium bg-black py-2 px-4 rounded-md hover:bg-gray-800 transition"
                onClick={() => setShowNoDatePopup(false)}
              >
                V redu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}