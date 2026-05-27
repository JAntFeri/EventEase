import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

export default function AdminFinalizeView({ eventData: propEventData, onBack }) {
  const { adminToken } = useParams(); 
  const [searchParams] = useSearchParams(); 
  const navigate = useNavigate();
  
  const basicToken = searchParams.get('invite');

  const [eventData, setEventData] = useState(propEventData || null);
  const [loading, setLoading] = useState(!propEventData);
  const [error, setError] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (propEventData) {
      setEventData(propEventData);
      return;
    }

    async function fetchAdminData() {
      try {
        if (!basicToken) {
          throw new Error('Manjka vabilni žeton (?invite=...) v povezavi.');
        }

        const response = await fetch(`/api/polls/share/${basicToken}`);
        if (!response.ok) {
          throw new Error('Podatkov o dogodku ni mogoče najti. Preverite pravilnost povezave.');
        }
        const data = await response.json();
        
        setEventData({
          title: data.title,
          description: data.description,
          suggestedDates: (data.time_slots || []).map(slot => ({
            id: slot.id,
            date: slot.start_time.replace('T', ' ').split(' ')[0] 
          })),
          votes: data.votes || []
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (basicToken) {
      fetchAdminData();
    } else if (!propEventData) {
      setError('Napačna skrbniška povezava. Manjka identifikator povabila.');
      setLoading(false);
    }
  }, [basicToken, propEventData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500 text-sm font-light">
        Nalagam administratorske podatke...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center px-4">
        <h2 className="text-xl font-serif text-gray-900 mb-2">Napaka pri dostopu</h2>
        <p className="text-sm text-gray-600 max-w-sm font-light">{error}</p>
      </div>
    );
  }

  const { title, description, suggestedDates = [], votes = [] } = eventData;

  const slotVoteCounts = {};
  const slotVoters = {};

  suggestedDates.forEach(slot => {
    slotVoteCounts[slot.id] = 0;
    slotVoters[slot.id] = [];
  });

  votes.forEach(voteRecord => {
    const voterName = voteRecord.participant_name || "Neznanec";
    const choices = voteRecord.choices || voteRecord.date_votes || [];
    choices.forEach(choice => {
      if (choice.status === 'yes') {
        slotVoteCounts[choice.slot_id] = (slotVoteCounts[choice.slot_id] || 0) + 1;
        if (!slotVoters[choice.slot_id]) slotVoters[choice.slot_id] = [];
        slotVoters[choice.slot_id].push(voterName);
      }
    });
  });

  const totalUniqueParticipants = votes.length || 1;

  const handleFinalize = async (e) => {
    e.preventDefault();
    if (!adminToken) return alert('Nimate skrbniških pravic za zaključek tega dogodka.');
    if (!selectedSlotId) return alert('Prosimo, izberite končni termin za zaklep dogodka.');

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/polls/admin/${adminToken}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_slot_id: selectedSlotId 
        })
      });

      if (response.ok) {
        alert('Dogodek uspešno zaključen! Udeleženci bodo prejeli obvestila s koledarsko datoteko.');
        navigate('/'); 
      } else {
        alert('Napaka na strežniku pri zaključevanju glasovanja.');
      }
    } catch (error) {
      console.error("Napaka pri zaključevanju polla:", error);
      alert('Omrežna napaka pri zaključevanju.');
    } finally {
      setIsSubmitting(false);
    }
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
    if (!dateStr) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('sl-SI', options);
  };

  return (
    <div className="py-12 md:py-16 px-4 max-w-2xl mx-auto">
      <div className="mb-8 border-b border-gray-100 pb-6">
        {onBack && (
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-black mb-4 flex items-center gap-1 transition">
            ← Nazaj
          </button>
        )}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider">
            Skrbniški pogled (Admin)
          </span>
        </div>
        <h1 className="font-serif text-3xl font-normal text-gray-900 mb-2">{title}</h1>
        {description && (
          <p className="text-sm text-gray-600 font-light mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
            {description}
          </p>
        )}
      </div>

      <form onSubmit={handleFinalize} className="space-y-6">
        <div>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
            Trenutni rezultati glasovanja
          </label>
          <p className="text-xs text-gray-400 font-light mb-3">
            Preglejte odgovore oddane s strani uporabnikov in izberite končni potrjen termin za ta dogodek.
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
          {suggestedDates.map((slot) => {
            const voteCount = slotVoteCounts[slot.id] || 0;
            const votersList = slotVoters[slot.id] || [];
            const percentage = Math.round((voteCount / totalUniqueParticipants) * 100) || 0;
            const isChecked = selectedSlotId === slot.id;

            return (
              //TOLE BO COMPONENT 
              <div key={slot.id} className={`p-4 flex items-center justify-between gap-4 transition-colors ${isChecked ? 'bg-amber-50/40' : 'bg-white'}`}>
                <label className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0">
                  <input 
                    type="radio" 
                    name="admin-finalize-slot" 
                    className="w-5 h-5 border-gray-300 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                    checked={isChecked}
                    onChange={() => setSelectedSlotId(slot.id)}
                  />
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 capitalize">{formatDate(slot.date)}</p>
                    {voteCount > 0 ? (
                      <p className="text-xs text-gray-500 font-light truncate mt-0.5">
                        Ustreza uporabnikom: <span className="font-medium text-gray-700">{votersList.join(', ')}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 font-light mt-0.5">Ni oddanih glasov za ta termin</p>
                    )}
                  </div>
                </label>

                <div className="flex items-center gap-3 w-32 justify-end shrink-0">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 hidden sm:block">
                    <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}/>
                  </div>
                  <span className="text-xs font-medium text-gray-700 tabular-nums min-w-[36px] text-right">
                    {voteCount} {getSlovenianVoteLabel(voteCount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs rounded-lg p-3 font-light leading-relaxed">
          <strong>Opozorilo:</strong> Izbira in potrditev termina bosta trajno zaključili glasovanje. Sistem bo samodejno poslal obvestila z datoteko koledarja vsem prijavljenim udeležencem.
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full text-sm text-white font-medium bg-black py-3 px-5 rounded-md hover:bg-gray-800 active:scale-95 disabled:bg-gray-400 disabled:scale-100 transition shadow-sm"
          >
            {isSubmitting ? 'Zaključujem glasovanje...' : 'Potrdi izbran termin in obvesti vse'}
          </button>
        </div>
      </form>
    </div>
  );
}