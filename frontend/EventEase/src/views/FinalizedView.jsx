// src/views/FinalizedView.jsx
// Shown to both admin and participant when a poll is already finalized.
// Receives: title, description, finalSlot { start_time, end_time }, isAdmin (bool)

export default function FinalizedView({ title, description, finalSlot, isAdmin = false }) {
  const formatDateTime = (iso) => {
    if (!iso) return "—";
    const clean = iso.replace(" ", "T").split("+")[0];
    const d = new Date(clean);
    if (isNaN(d)) return iso;
    return d.toLocaleString("sl-SI", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const clean = iso.replace(" ", "T").split("+")[0];
    const d = new Date(clean);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
  };

  const startLabel = formatDateTime(finalSlot?.start_time);
  const endTime = formatTime(finalSlot?.end_time);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-16 px-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="max-w-lg w-full mx-auto">

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {/* Calendar check icon */}
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-on-primary)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <polyline points="9 16 11 18 15 14" />
              </svg>
            </div>
            {/* Thin accent ring */}
            <div
              className="absolute -inset-2 rounded-full pointer-events-none"
              style={{ border: "1.5px solid var(--color-accent-2)", opacity: 0.5 }}
            />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-primary)", opacity: 0.55 }}
          >
            {isAdmin ? "Glasovanje zaključeno" : "Termin potrjen"}
          </p>

          <h1
            className="text-4xl md:text-5xl leading-tight mb-3"
            style={{ color: "var(--color-text)", fontFamily: "'Georgia', serif", fontWeight: 400 }}
          >
            {title}
          </h1>

          {description && (
            <p
              className="text-sm leading-relaxed mt-2"
              style={{ color: "var(--color-text)", opacity: 0.5 }}
            >
              {description}
            </p>
          )}

          <div
            className="mt-5 h-px w-12 mx-auto"
            style={{ backgroundColor: "var(--color-accent-2)" }}
          />
        </div>

        {/* Chosen date card */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-primary) 6%, var(--color-bg))",
            border: "1.5px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text)", opacity: 0.4 }}
          >
            Izbrani termin
          </p>

          {finalSlot ? (
            <div className="flex items-start gap-4">
              {/* Date block */}
              <div
                className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {(() => {
                  const clean = (finalSlot.start_time || "").replace(" ", "T").split("+")[0];
                  const d = new Date(clean);
                  if (isNaN(d)) return <span style={{ color: "var(--color-on-primary)", fontSize: 11 }}>—</span>;
                  return (
                    <>
                      <span
                        className="text-xl font-semibold leading-none"
                        style={{ color: "var(--color-on-primary)" }}
                      >
                        {d.getDate()}
                      </span>
                      <span
                        className="text-xs uppercase tracking-wide mt-0.5"
                        style={{ color: "var(--color-on-primary)", opacity: 0.75 }}
                      >
                        {d.toLocaleString("sl-SI", { month: "short" })}
                      </span>
                    </>
                  );
                })()}
              </div>

              {/* Time + full label */}
              <div>
                <p
                  className="text-lg font-medium leading-snug"
                  style={{ color: "var(--color-text)" }}
                >
                  {startLabel}
                </p>
                {endTime && (
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--color-text)", opacity: 0.5 }}
                  >
                    do {endTime}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text)", opacity: 0.5 }}>
              Podatki o terminu niso na voljo.
            </p>
          )}
        </div>

        {/* Info note */}
        <div
          className="rounded-xl px-4 py-3.5 text-xs leading-relaxed"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-primary) 4%, var(--color-bg))",
            border: "1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)",
            color: "var(--color-text)",
            opacity: 0.7,
          }}
        >
          {isAdmin
            ? "Glasovanje je zaključeno. Vsi udeleženci so bili obveščeni o izbranem terminu z datoteko .ics za koledar."
            : "Organizator je potrdil zgornji termin. Če ste vnesli e-pošto ste prejeli datoteko .ics za uvoz v koledar."}
        </div>
      </div>
    </div>
  );
}
