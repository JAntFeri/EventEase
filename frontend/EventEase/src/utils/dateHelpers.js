// Backend vrača časovne žige v Postgresovi obliki "YYYY-MM-DD HH:MM:SS[.ffffff]+TZ".
// Frontend termine prikazuje kot lokalni "stenski" čas, zato časovni pas odrežemo.
const ZONE_AFTER_TIME = /(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?:Z|[+-]\d{2}(?::?\d{2})?)$/;

export function normalizePgTimestamp(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed === "") return "";
  return trimmed.replace(" ", "T").replace(ZONE_AFTER_TIME, "$1");
}

export function timeOfDay(value) {
  const [, time] = normalizePgTimestamp(value).split("T");
  return time ? time.slice(0, 5) : null;
}

export function toSuggestedDates(timeSlots) {
  if (!Array.isArray(timeSlots)) return [];
  return timeSlots
    .filter((slot) => slot && slot.start_time)
    .map((slot) => {
      const start = normalizePgTimestamp(slot.start_time);
      return {
        id: slot.id,
        date: start.split("T")[0],
        start_time: start,
        end_time: slot.end_time,
      };
    });
}
