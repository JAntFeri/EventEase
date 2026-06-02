import React, { useEffect, useRef, useState } from 'react';
import CalendarPicker from '../components/CalendarPicker';

export default function CreateEventWizard({ onCancel, onCreate }) {
  const [formData, setFormData] = useState({ title: '', description: '', organizer_email: '', tasks: '' });
  const [pollDates, setPollDates] = useState([]);
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);
  
  // States to hold the generated links and handle clipboard feedback
  const [adminLink, setAdminLink] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      setNotice({ type: 'error', message: 'Prosimo, vnesite naslov dogodka.' });
      return;
    }
    if (!formData.organizer_email) {
      setNotice({ type: 'error', message: 'Prosimo, vnesite e-poštni naslov organizatorja.' });
      return;
    }
    setNotice(null);

    const timeSlots = pollDates.map(date => ({
      start_time: `${date}T00:00:00Z`,
      end_time: `${date}T23:59:59Z`
    }));

    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          organizer_email: formData.organizer_email,
          time_slots: timeSlots,                      
          tasks: formData.tasks.split('\n').filter(t => t.trim() !== '')
        })
      });
      
      if (!response.ok) throw new Error('Napaka na strežniku.');
      
      const data = await response.json();

      if (data.admin_token && data.share_token) {
        //mi ga samo combinamo tako pravi maćoti
        setAdminLink(`${window.location.origin}/admin/${data.admin_token}?invite=${data.share_token}`);
        setShareLink(`${window.location.origin}/invite/${data.share_token}`);
      } else {
        setNotice({ type: 'error', message: 'Strežnik ni vrnil vseh potrebnih žetonov za povezave.' });
      }

      
    } catch (error) {
      console.error("Napaka pri ustvarjanju dogodka:", error);
      setNotice({ type: 'error', message: 'Napaka pri komuniciranju s strežnikom.' });
    }
  };

  useEffect(() => {
    if (notice && noticeRef.current) {
      noticeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [notice]);

  if (adminLink && shareLink) {
    return (
      <div className="py-12 md:py-16 px-4 max-w-xl mx-auto animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="font-serif text-3xl font-normal text-gray-900 text-center mb-2">Dogodek uspešno ustvarjen!</h1>
        <p className="text-sm text-gray-600 font-light text-center mb-8">Shranite spodnji povezavi. Ena je namenjena vam za urejanje, druga pa povabljencem.</p>
        
        <div className="space-y-6">
          {/* LINK 1: FOR ADMIN */}
          <div className="block p-4 border border-amber-200 rounded-xl bg-amber-50/50 shadow-sm">
            <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
              🔑 Povezava za Skrbnika (Admin)
            </label>
            <p className="text-xs text-amber-700 font-light mb-3">
              S to povezavo lahko dodajate termine, spremljate rezultate in zaključite glasovanje. Ne delite je z drugimi!
            </p>
            <div className="flex items-center gap-2 p-2 border border-amber-200 rounded-lg bg-white">
              <input 
                type="text" 
                readOnly 
                value={adminLink} 
                className="bg-transparent text-sm text-gray-800 px-2 outline-none w-full font-mono select-all"
              />
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard.writeText(adminLink);
                  setCopiedAdmin(true);
                  setTimeout(() => setCopiedAdmin(false), 2000);
                }}
                className={`text-xs font-medium py-2 px-4 rounded transition shrink-0 ${copiedAdmin ? 'bg-emerald-700 text-white' : 'bg-amber-800 text-white hover:bg-amber-900'}`}
              >
                {copiedAdmin ? 'Kopirano!' : 'Kopiraj'}
              </button>
            </div>
          </div>

          {/* LINK 2: FOR PARTICIPANTS */}
          <div className="block p-4 border border-blue-200 rounded-xl bg-blue-50/50 shadow-sm">
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
              📢 Povezava za Povabljence (Uporabniki)
            </label>
            <p className="text-xs text-blue-700 font-light mb-3">
              To povezavo pošljite prijateljem, sodelavcem ali udeležencem, da bodo lahko oddali svoje glasove.
            </p>
            <div className="flex items-center gap-2 p-2 border border-blue-200 rounded-lg bg-white">
              <input 
                type="text" 
                readOnly 
                value={shareLink} 
                className="bg-transparent text-sm text-gray-800 px-2 outline-none w-full font-mono select-all"
              />
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2000);
                }}
                className={`text-xs font-medium py-2 px-4 rounded transition shrink-0 ${copiedShare ? 'bg-emerald-700 text-white' : 'bg-blue-800 text-white hover:bg-blue-900'}`}
              >
                {copiedShare ? 'Kopirano!' : 'Kopiraj'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <button 
            type="button" 
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-900 font-medium underline transition"
          >
            Nazaj na začetno stran
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16 px-4 max-w-xl mx-auto">
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-normal text-gray-900 mb-2">Ustvari nov dogodek</h1>
        <p className="text-sm text-gray-600 font-light">Brez registracije. Izpolnite osnovne podatke in prejmite povezavo do vabila.</p>
      </div>

      {notice && (
        <div ref={noticeRef} className={`mb-6 rounded-xl border px-4 py-3 text-xs font-light ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="title">Naslov dogodka *</label>
          <input type="text" id="title" name="title" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="npr. Sestanek študentskega društva..." value={formData.title} onChange={handleChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="organizer_email">E-pošta organizatorja *</label>
          <input type="email" id="organizer_email" name="organizer_email" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="npr. tvoj.email@primer.com" value={formData.organizer_email} onChange={handleChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="description">Opis dogodka</label>
          <textarea id="description" name="description" rows="3" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="Kratek opis, lokacija ali namen srečanja..." value={formData.description} onChange={handleChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Predlagaj datume za glasovanje</label>
          <CalendarPicker selectedDates={pollDates} onChange={setPollDates} isPollMode={true} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="tasks">Dodelitev nalog (Ena naloga na vrstico)</label>
          <textarea id="tasks" name="tasks" rows="2" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="npr. Rezervacija prostora&#10;Priprava gradiva" value={formData.tasks} onChange={handleChange} />
        </div>

        <div className="flex flex-wrap-reverse gap-3 pt-4">
          <button type="button" className="flex-1 min-w-[140px] text-sm text-gray-600 font-medium bg-transparent border border-gray-300 py-3 px-5 rounded-md hover:bg-gray-50 hover:text-gray-900 transition" onClick={onCancel}>Prekliči</button>
          <button type="submit" className="flex-1 min-w-[140px] text-sm text-white font-medium bg-black py-3 px-5 rounded-md hover:bg-gray-800 active:scale-95 transition shadow-sm">Ustvari in deli</button>
        </div>
      </form>
    </div>
  );
}