import React, { useState } from 'react';

export default function CalendarPicker({ 
  selectedDates = [], 
  onChange, 
  isPollMode = false, 
  allowedDates = null 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Januar", "Februar", "Marec", "April", "Maj", "Junij", 
    "Julij", "Avgust", "September", "Oktober", "November", "December"
  ];

  const weekDays = ["Po", "To", "Sr", "Če", "Pe", "So", "Ne"];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const blankCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDateClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (allowedDates && !allowedDates.includes(dateStr)) return;

    let updatedDates = selectedDates.includes(dateStr)
      ? selectedDates.filter(d => d !== dateStr)
      : [...selectedDates, dateStr];
    
    if (onChange) onChange(updatedDates);
  };

  const days = [];
  for (let i = 0; i < blankCells; i++) days.push({ type: 'blank', val: i });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let stateStyles = 'hover:bg-gray-100 text-gray-900';
    
    if (selectedDates.includes(dateKey)) {
      stateStyles = 'bg-black text-white font-medium hover:bg-gray-800';
    } else if (allowedDates) {
      stateStyles = allowedDates.includes(dateKey) 
        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium hover:bg-indigo-100' 
        : 'text-gray-300 cursor-not-allowed opacity-40';
    }
    days.push({ type: 'day', val: d, key: dateKey, stateStyles });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button type="button" className="p-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>&larr;</button>
        <span className="text-sm font-semibold text-gray-900">{monthNames[month]} {year}</span>
        <button type="button" className="p-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>&rarr;</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-2">
        {weekDays.map(wd => <span key={wd}>{wd}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((item, index) => (
          item.type === 'blank' ? (
            <span key={`b-${item.val}`} className="aspect-square" />
          ) : (
            <button
              key={item.key}
              type="button"
              className={`aspect-square rounded-lg text-sm transition flex items-center justify-center ${item.stateStyles}`}
              onClick={() => handleDateClick(item.val)}
            >
              {item.val}
            </button>
          )
        ))}
      </div>
      
      {isPollMode && (
        <p className="text-xs text-gray-500 mt-3 text-center font-light">
          {allowedDates ? "Izberite modre datume, ki vam ustrezajo." : "Izberete lahko več datumov za glasovanje."}
        </p>
      )}
    </div>
  );
}