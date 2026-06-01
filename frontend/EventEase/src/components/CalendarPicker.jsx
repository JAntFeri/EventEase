import React, { useState } from "react";

export default function CalendarPicker({
  selectedDates = [],
  onChange,
  dateStatuses = {},
  onDateStatusesChange,
  isPollMode = false,
  allowedDates = null,
  suggestions = [],
  onSuggestionSelect,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Januar", "Februar", "Marec", "April", "Maj", "Junij",
    "Julij", "Avgust", "September", "Oktober", "November", "December",
  ];

  const weekDays = ["Po", "To", "Sr", "Če", "Pe", "So", "Ne"];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const blankCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDateClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (allowedDates && !allowedDates.includes(dateStr)) return;

    if (allowedDates) {
      const currentStatus = dateStatuses[dateStr] || "no";
      const nextStatus =
        currentStatus === "no" ? "yes"
        : currentStatus === "yes" ? "if_needed"
        : "no";

      const updatedStatuses = { ...dateStatuses };
      if (nextStatus === "no") {
        delete updatedStatuses[dateStr];
      } else {
        updatedStatuses[dateStr] = nextStatus;
      }

      if (onDateStatusesChange) onDateStatusesChange(updatedStatuses);
      return;
    }

    const updatedDates = selectedDates.includes(dateStr)
      ? selectedDates.filter((d) => d !== dateStr)
      : [...selectedDates, dateStr];

    if (onChange) onChange(updatedDates);
  };

  const days = [];
  for (let i = 0; i < blankCells; i++) days.push({ type: "blank", val: i });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const dateSuggestions = suggestions.filter((s) => s.date === dateKey);
    const isSuggested = dateSuggestions.length > 0;

    let stateStyles = "hover:bg-gray-100 text-gray-900";

    if (allowedDates) {
      if (!allowedDates.includes(dateKey)) {
        stateStyles = "text-gray-300 cursor-not-allowed opacity-40";
      } else {
        const dateStatus = dateStatuses[dateKey] || "no";
        if (dateStatus === "yes") {
          stateStyles = "bg-green-500 text-white font-medium hover:bg-green-600";
        } else if (dateStatus === "if_needed") {
          stateStyles = "bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-500";
        } else {
          stateStyles = "bg-white border border-red-400 text-red-600 font-medium hover:bg-red-50";
        }
      }
    } else if (selectedDates.includes(dateKey)) {
      stateStyles = "bg-black text-white font-medium hover:bg-gray-800";
    } else if (isSuggested) {
      stateStyles = "ring-2 ring-blue-400 text-gray-900 hover:bg-gray-100";
    }

    days.push({ type: "day", val: d, key: dateKey, stateStyles, isSuggested, dateSuggestions });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          className="p-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition"
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
        >
          &larr;
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          className="p-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition"
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
        >
          &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-2">
        {weekDays.map((wd) => (
          <span key={wd}>{wd}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((item) =>
          item.type === "blank" ? (
            <span key={`b-${item.val}`} className="aspect-square" />
          ) : (
            <div key={item.key} className="relative group">
              <button
                type="button"
                className={`aspect-square rounded-lg text-sm transition flex items-center justify-center w-full ${item.stateStyles}`}
                onClick={() => {
                  if (item.isSuggested && onSuggestionSelect) {
                    onSuggestionSelect(item.key, item.dateSuggestions);
                  }
                  handleDateClick(item.val);
                }}
              >
                {item.val}
              </button>
              {item.isSuggested && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 hidden group-hover:block w-max max-w-[140px]">
                  <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 leading-snug">
                    {item.dateSuggestions.map((s) => s.suggested_by).join(", ")}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {isPollMode && (
        <div className="text-xs text-gray-600 mt-3 font-light space-y-1">
          {allowedDates ? (
            <>
              <p className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-red-400 bg-white" />
                Ne
              </p>
              <p className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-green-500" />
                Da
              </p>
              <p className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-yellow-400" />
                Ce bo potrebno
              </p>
            </>
          ) : (
            <p className="text-center">Izberete lahko več datumov za glasovanje.</p>
          )}
        </div>
      )}
    </div>
  );
}