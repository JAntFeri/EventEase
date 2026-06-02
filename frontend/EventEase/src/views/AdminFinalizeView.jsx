import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import VoteResults from '../components/VoteResults';
import CalendarPicker from '../components/CalendarPicker';

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
  const [suggestions, setSuggestions] = useState([]);
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);

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

        // TODO: replace with real API call when GET /api/polls/admin/{adminToken} is ready
        // const adminResponse = await fetch(`/api/polls/admin/${adminToken}`);
        // const adminData = await adminResponse.json();
        // setSuggestions(adminData.suggestions || []);

        // Mock suggestions for now
        setSuggestions([
          {
            id: 'mock-1',
            poll_id: 'mock',
            suggested_by: 'Janez',
            start_time: '2026-06-20T00:00:00Z',
            status: 'pending'
          },
          {
            id: 'mock-2',
            poll_id: 'mock',
            suggested_by: 'Ana',
            start_time: '2026-06-25T00:00:00Z',
            status: 'pending'
          }
        ]);

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

  const handleSuggestionAction = async (suggestionId, action) => {
    // TODO: uncomment when endpoints are ready
    // await fetch(`/api/polls/admin/${adminToken}/suggestions/${suggestionId}/${action}`, { method: 'POST' });

    setSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, status: action === 'accept' ? 'accepted' : 'rejected' } : s
    ));
    setPendingSuggestion(null);
  };

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

  const handleFinalize = async (e) => {
    e.preventDefault();
    if (!adminToken) {
      setNotice({ type: 'error', message: 'Nimate skrbniških pravic za zaključek tega dogodka.' });
      return;
    }
    if (!selectedSlotId) {
      setNotice({ type: 'error', message: 'Prosimo, izberite končni termin za zaklep dogodka.' });
      return;
    }
    setNotice(null);

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/polls/admin/${adminToken}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_slot_id: selectedSlotId })
      });

      if (response.ok) {
        setNotice({ type: 'success', message: 'Dogodek uspešno zaključen! Udeleženci bodo prejeli obvestila s koledarsko datoteko.' });
        setTimeout(() => navigate('/'), 1200);
      } else {
        setNotice({ type: 'error', message: 'Napaka na strežniku pri zaključevanju glasovanja.' });
      }
    } catch (error) {
      console.error("Napaka pri zaključevanju polla:", error);
      setNotice({ type: 'error', message: 'Omrežna napaka pri zaključevanju.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  useEffect(() => {
    if (notice && noticeRef.current) {
      noticeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [notice]);

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

      {notice && (
        <div ref={noticeRef} className={`mb-6 rounded-xl border px-4 py-3 text-xs font-light ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.message}
        </div>
      )}

      {/* Suggestions section */}
      {pendingSuggestions.length > 0 && (
        <div className="mb-8 border border-blue-100 bg-blue-50 rounded-xl p-4">
          <h2 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            Predlogi datumov udeležencev
          </h2>
          <p className="text-xs text-blue-600 font-light mb-3">
            Modro označeni datumi so predlogi udeležencev. Kliknite na datum za sprejem ali zavrnitev.
          </p>
          <CalendarPicker
            suggestions={pendingSuggestions.map(s => ({
              id: s.id,
              date: s.start_time.split('T')[0],
              suggested_by: s.suggested_by
            }))}
            onSuggestionSelect={(date, dateSuggestions) => setPendingSuggestion(dateSuggestions[0])}
          />
          {pendingSuggestion && (
            <div className="mt-3 p-3 bg-white border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-800 mb-2">
                Predlog od <strong>{pendingSuggestion.suggested_by}</strong>: {pendingSuggestion.date}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSuggestionAction(pendingSuggestion.id, 'accept')}
                  className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md transition"
                >
                  Sprejmi → dodaj v poll
                </button>
                <button
                  type="button"
                  onClick={() => handleSuggestionAction(pendingSuggestion.id, 'reject')}
                  className="text-xs text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-md transition"
                >
                  Zavrni
                </button>
                <button
                  type="button"
                  onClick={() => setPendingSuggestion(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 transition"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleFinalize} className="space-y-6">
        <div>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1">
            Trenutni rezultati glasovanja
          </label>
          <p className="text-xs text-gray-400 font-light mb-3">
            Preglejte odgovore oddane s strani uporabnikov in izberite končni potrjen termin za ta dogodek.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Izberite končni termin:
          </label>
          <div className="space-y-2">
            {suggestedDates.map((slot) => {
              const isChecked = selectedSlotId === slot.id;
              return (
                <div 
                  key={slot.id} 
                  className={`flex items-start gap-3 p-2 rounded-xl transition-colors ${
                    isChecked ? 'bg-amber-50/60 ring-1 ring-amber-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="pt-4 pl-2">
                    <input 
                      type="radio" 
                      name="admin-finalize-slot" 
                      className="w-5 h-5 border-gray-300 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                      checked={isChecked}
                      onChange={() => setSelectedSlotId(slot.id)}
                    />
                  </div>
                  <div className="flex-1 pointer-events-none">
                    <VoteResults 
                      suggestedDates={[slot]} 
                      votes={votes} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
            {isSubmitting ? 'Zaklujem glasovanje...' : 'Potrdi izbran termin in obvesti vse'}
          </button>
        </div>
      </form>
    </div>
  );
}