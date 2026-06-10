import { useEffect, useRef, useState } from "react";
import CalendarPicker from "../components/CalendarPicker";
import VoteResults from "../components/VoteResults";
import { isValidVoteStatus } from "../utils/eventHelpers.js";

export default function InviteView({ eventData }) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [dateVotes, setDateVotes] = useState({});
  const [claimedTasks, setClaimedTasks] = useState([]);
  const [showNoDatePopup, setShowNoDatePopup] = useState(false);
  const [notice, setNotice] = useState(null);
  const [suggestNotice, setSuggestNotice] = useState(null);
  const noticeRef = useRef(null);
  const suggestNoticeRef = useRef(null);

  const {
    title,
    description,
    suggestedDates,
    tasks,
    organizerName,
    share_token,
    votes = [],
  } = eventData;

  const [resultsVisible, setResultsVisible] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [resultsData, setResultsData] = useState(() => ({
    suggestedDates: suggestedDates || [],
    votes,
  }));
  const resultsErrorRef = useRef(null);

  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestionDates, setSuggestionDates] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const toggleTask = (taskName) => {
    setClaimedTasks((prev) =>
      prev.includes(taskName)
        ? prev.filter((t) => t !== taskName)
        : [...prev, taskName],
    );
  };

  const handleSubmitSuggestion = async () => {
    if (!guestName.trim()) {
      setSuggestNotice({
        type: "error",
        message: "Najprej vpišite svoje ime v obrazec.",
      });
      return;
    }
    if (suggestionDates.length === 0) {
      setSuggestNotice({ type: "error", message: "Izberite vsaj en datum." });
      return;
    }
    setSuggestNotice(null);
    const cleanedDates = suggestionDates
      .map((d) => {
        if (!d) return null;
        if (typeof d === "string") return d;
        if (d instanceof Date) return d.toISOString().split(".")[0];
        if (d.start_time) return d.start_time;
        if (d.date) return `${d.date}T12:00:00`;
        return null;
      })
      .filter(Boolean);

    setIsSuggesting(true);
    try {
      const response = await fetch(`/api/polls/share/${share_token}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggested_by: guestName.trim(),
          dates: cleanedDates,
        }),
      });
      if (response.ok) {
        setShowSuggestModal(false);
        setSuggestionDates([]);
        setNotice({
          type: "success",
          message: "Predlogi uspešno poslani organizatorju.",
        });
      } else {
        setSuggestNotice({
          type: "error",
          message: "Napaka pri pošiljanju predlogov.",
        });
      }
    } catch {
      setSuggestNotice({ type: "error", message: "Omrežna napaka." });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setNotice({ type: "error", message: "Vpišite ime." });
      return;
    }
    const selectedSlots = Object.keys(dateVotes).filter(
      (k) => dateVotes[k] === "yes" || dateVotes[k] === "if_needed",
    );
    if (selectedSlots.length === 0) return setShowNoDatePopup(true);
    setNotice(null);

    const formattedVotes = suggestedDates.map((slot) => {
      const currentVoteStatus = dateVotes[slot.id] || dateVotes[slot.date];
      let backendStatus = "no";
      if (currentVoteStatus === "yes") backendStatus = "yes";
      else if (currentVoteStatus === "if_needed") backendStatus = "if_need_be";
      return {
        slot_id: slot.id,
        status: isValidVoteStatus(backendStatus) ? backendStatus : "no",
      };
    });

    try {
      const response = await fetch(`/api/polls/share/${share_token}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_name: guestName.trim(),
          participant_email: guestEmail.trim(),
          date_votes: formattedVotes,
          claimed_tasks: claimedTasks,
        }),
      });
      if (response.ok) setIsSubmitted(true);
      else
        setNotice({
          type: "error",
          message: "Napaka pri oddaji glasu na strežniku.",
        });
    } catch {
      setNotice({ type: "error", message: "Omrežna napaka pri oddaji glasu." });
    }
  };

  const fetchResults = async () => {
    try {
      setResultsError("");
      setResultsLoading(true);
      const response = await fetch(`/api/polls/share/${share_token}`);
      if (!response.ok)
        throw new Error("Rezultatov ni mogoče pridobiti. Poskusite znova.");
      const data = await response.json();
      const formattedSlots = (data.time_slots || [])
        .map((slot) => {
          if (!slot.start_time) return null;
          return {
            id: slot.id,
            date: slot.start_time.replace("T", " ").split(" ")[0],
            start_time: slot.start_time,
            end_time: slot.end_time,
          };
        })
        .filter(Boolean);
      setResultsData({
        suggestedDates: formattedSlots,
        votes: Array.isArray(data.votes) ? data.votes : [],
      });
    } catch (error) {
      setResultsError(error.message || "Napaka pri nalaganju rezultatov.");
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

  useEffect(() => {
    if (notice && noticeRef.current)
      noticeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [notice]);
  useEffect(() => {
    if (suggestNotice && suggestNoticeRef.current)
      suggestNoticeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }, [suggestNotice]);
  useEffect(() => {
    if (resultsError && resultsErrorRef.current)
      resultsErrorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }, [resultsError]);

  const plainDisplayDates = suggestedDates.map((slot) =>
    slot.start_time ? slot.start_time.split("T")[0] : slot.date,
  );

  // ── SUCCESS STATE ──────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div
        className="flex flex-col justify-center items-center min-h-[70vh] text-center px-6 max-w-lg mx-auto py-16"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="relative mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-on-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div
            className="absolute -inset-1.5 rounded-full"
            style={{ border: "1.5px solid var(--color-accent-2)", opacity: 0.5 }}
          />
        </div>

        <h1
          className="text-4xl font-normal mb-2"
          style={{ color: "var(--color-text)", fontFamily: "'Georgia', serif" }}
        >
          Hvala, {guestName}!
        </h1>
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: "var(--color-text)", opacity: 0.55 }}
        >
          Vaša udeležba pri{" "}
          <span className="font-medium" style={{ color: "var(--color-primary)" }}>
            "{title}"
          </span>{" "}
          je zabeležena. Ko organizator zaključi glasovanje, boste prejeli obvestilo.
        </p>

        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          <button
            onClick={handleToggleResults}
            className="w-full py-3 px-5 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }}
          >
            {resultsVisible ? "Skrij rezultate" : "Prikaži rezultate glasovanja"}
          </button>
          <button
            onClick={() => setIsSubmitted(false)}
            className="w-full py-3 px-5 rounded-xl text-sm font-medium transition-all hover:opacity-70"
            style={{
              border: "1.5px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
              color: "var(--color-primary)",
              backgroundColor: "transparent",
            }}
          >
            Spremeni moje odgovore
          </button>
        </div>

        {resultsVisible && (
          <div className="w-full mt-8">
            {resultsLoading && (
              <p className="text-xs" style={{ color: "var(--color-text)", opacity: 0.45 }}>
                Nalagam rezultate...
              </p>
            )}
            {!resultsLoading && resultsError && (
              <p ref={resultsErrorRef} className="text-xs" style={{ color: "#ef4444" }}>
                {resultsError}
              </p>
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

  // ── MAIN FORM ──────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen py-14 md:py-20 px-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-primary)", opacity: 0.6 }}
          >
            {organizerName || "Organizator"} vas vabi
          </p>

          <h1
            className="text-4xl md:text-5xl leading-tight mb-3"
            style={{ color: "var(--color-text)", fontFamily: "'Georgia', serif", fontWeight: 400 }}
          >
            {title}
          </h1>

          {description && (
            <p
              className="text-sm leading-relaxed mt-1"
              style={{ color: "var(--color-text)", opacity: 0.5 }}
            >
              {description}
            </p>
          )}

          <div className="mt-6 h-px w-12" style={{ backgroundColor: "var(--color-accent-2)" }} />
        </div>

        {/* Notice */}
        {notice && (
          <div
            ref={noticeRef}
            className="mb-6 rounded-xl px-4 py-3 text-sm"
            style={
              notice.type === "error"
                ? { backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }
                : {
                    backgroundColor: "color-mix(in srgb, var(--color-primary) 6%, var(--color-bg))",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
                    color: "var(--color-primary)",
                  }
            }
          >
            {notice.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name */}
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text)", opacity: 0.45 }}
            >
              Tvoje ime
            </label>
            <input
              type="text"
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
              style={{
                backgroundColor: "transparent",
                border: "1.5px solid color-mix(in srgb, var(--color-primary) 18%, transparent)",
                color: "var(--color-text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
              onBlur={(e) =>
                (e.target.style.borderColor =
                  "color-mix(in srgb, var(--color-primary) 18%, transparent)")
              }
              placeholder="Vpiši svoje ime..."
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label
                className="block text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text)", opacity: 0.45 }}
              >
                E-poštni naslov
              </label>
              <span
                className="text-xs"
                style={{ color: "var(--color-text)", opacity: 0.35 }}
              >
                Izbirno — za obvestilo o terminu
              </span>
            </div>
            <input
              type="email"
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
              style={{
                backgroundColor: "transparent",
                border: "1.5px solid color-mix(in srgb, var(--color-primary) 18%, transparent)",
                color: "var(--color-text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
              onBlur={(e) =>
                (e.target.style.borderColor =
                  "color-mix(in srgb, var(--color-primary) 18%, transparent)")
              }
              placeholder="ime@example.com"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </div>

          {/* Calendar */}
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text)", opacity: 0.45 }}
            >
              Kateri termini ti ustrezajo?
            </label>
            <div
              className="rounded-xl p-4"
              style={{
                border: "1.5px solid color-mix(in srgb, var(--color-primary) 12%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--color-primary) 2%, var(--color-bg))",
              }}
            >
              <CalendarPicker
                selectedDates={suggestedDates}
                dateStatuses={dateVotes}
                onDateStatusesChange={setDateVotes}
                isPollMode={true}
                allowedDates={plainDisplayDates}
              />
            </div>
          </div>

          {/* Tasks */}
          {tasks && tasks.length > 0 && (
            <div className="space-y-2">
              <label
                className="block text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text)", opacity: 0.45 }}
              >
                Pomoč pri organizaciji{" "}
                <span className="font-normal" style={{ opacity: 0.6 }}>
                  (izbirno)
                </span>
              </label>
              <div className="space-y-2">
                {tasks.map((task) => {
                  const isClaimed = claimedTasks.includes(task);
                  return (
                    <div
                      key={task}
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-all"
                      style={{
                        border: isClaimed
                          ? "1.5px solid var(--color-accent-2)"
                          : "1.5px solid color-mix(in srgb, var(--color-primary) 14%, transparent)",
                        backgroundColor: isClaimed
                          ? "color-mix(in srgb, var(--color-primary) 5%, var(--color-bg))"
                          : "transparent",
                      }}
                    >
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{
                            color: "var(--color-text)",
                            textDecoration: isClaimed ? "line-through" : "none",
                            opacity: isClaimed ? 0.45 : 1,
                          }}
                        >
                          {task}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-primary)", opacity: 0.6 }}
                        >
                          {isClaimed ? `Prevzel/a: ${guestName}` : "Na voljo"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTask(task)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={
                          isClaimed
                            ? { backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }
                            : {
                                backgroundColor: "transparent",
                                border: "1.5px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                                color: "var(--color-primary)",
                              }
                        }
                      >
                        {isClaimed ? "Izpusti" : "Prevzemi"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="space-y-2.5 pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }}
            >
              Potrdi udeležbo
            </button>
            <button
              type="button"
              onClick={() => {
                setSuggestNotice(null);
                setShowSuggestModal(true);
              }}
              className="w-full py-3.5 px-6 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: "transparent",
                border: "1.5px solid var(--color-accent-2)",
                color: "var(--color-primary)",
              }}
            >
              Predlagaj nov datum
            </button>
          </div>
        </form>
      </div>

      {/* No date popup */}
      {showNoDatePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)",
            }}
          >
            <h2 className="text-base font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
              Izberite termin
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text)", opacity: 0.55 }}>
              Pred potrditvijo udeležbe izberite vsaj en datum.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowNoDatePopup(false)}
                className="py-2.5 px-5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }}
              >
                V redu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)",
            }}
          >
            <h2 className="text-base font-semibold mb-1" style={{ color: "var(--color-text)" }}>
              Predlagaj datum
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text)", opacity: 0.5 }}>
              Izberite datume ki bi vam ustrezali. Organizator jih bo pregledal.
            </p>
            <CalendarPicker
              selectedDates={suggestionDates}
              onChange={setSuggestionDates}
              isPollMode={false}
            />
            {suggestNotice && (
              <div
                ref={suggestNoticeRef}
                className="mt-3 rounded-xl px-3 py-2 text-xs"
                style={
                  suggestNotice.type === "error"
                    ? { backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }
                    : {
                        backgroundColor: "color-mix(in srgb, var(--color-primary) 6%, var(--color-bg))",
                        border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
                        color: "var(--color-primary)",
                      }
                }
              >
                {suggestNotice.message}
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSuggestModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all hover:opacity-70"
                style={{
                  borderColor: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
                  color: "var(--color-text)",
                  backgroundColor: "transparent",
                }}
              >
                Prekliči
              </button>
              <button
                type="button"
                onClick={handleSubmitSuggestion}
                disabled={isSuggesting}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }}
              >
                {isSuggesting ? "Pošiljam..." : "Pošlji predlog"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}