import React, { useState } from 'react';
import CalendarPicker from '../components/CalendarPicker';
export default function InviteView({ eventData }) {
  const [submitted, setSubmitted] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [dateVotes, setDateVotes] = useState({});
  const [claimedTasks, setClaimedTasks] = useState([]);
  const [showNoDatePopup, setShowNoDatePopup] = useState(false);

  const { title, description, suggestedDates, tasks, organizerName } = eventData;

  const toggleTask = (taskName) => {
    setClaimedTasks(prev => prev.includes(taskName) ? prev.filter(t => t !== taskName) : [...prev, taskName]);
  };

  if (submitted) {
    return (
      <div className="py-20 px-4 max-w-xl mx-auto text-center">
        <span className="text-4xl mb-4 block">🎉</span>
        <h1 className="font-serif text-3xl text-gray-900 mb-2">Hvala, {guestName}!</h1>
        <p className="text-gray-600 font-light">Vaša udeležba je potrjena. Dogodek je bil samodejno dodan v vaš koledar.</p>
        <button className="mt-8 text-sm text-gray-600 border border-gray-300 py-2.5 px-5 rounded-md hover:bg-gray-50 transition" onClick={() => window.location.reload()}>Nazaj na vabilo</button>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16 px-4 max-w-xl mx-auto">
      <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 py-1 px-2.5 rounded-full mb-4">{organizerName} vas vabi!</span>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-normal text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 font-light leading-relaxed">{description || 'Ni opisa.'}</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if(!guestName) return alert('Vpišite ime.'); if(!Object.keys(dateVotes).length) return setShowNoDatePopup(true); setSubmitted(true); }} className="space-y-8">
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
            allowedDates={suggestedDates}
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