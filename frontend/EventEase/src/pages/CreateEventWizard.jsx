import React, { useState } from 'react';
import CalendarPicker from '../components/CalendarPicker';
export default function CreateEventWizard({ onCancel, onCreate }) {
  const [formData, setFormData] = useState({ title: '', description: '', tasks: '' });
  const [pollDates, setPollDates] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return alert('Prosimo, vnesite naslov dogodka.');
    onCreate({ ...formData, suggestedDates: pollDates });
  };

  return (
    <div className="py-12 md:py-16 px-4 max-w-xl mx-auto">
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-normal text-gray-900 mb-2">Ustvari nov dogodek</h1>
        <p className="text-sm text-gray-600 font-light">Brez registracije. Izpolnite osnovne podatke in prejmite povezavo do vabila.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="title">Naslov dogodka *</label>
          <input type="text" id="title" name="title" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="npr. Sestanek študentskega društva..." value={formData.title} onChange={handleChange} required />
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