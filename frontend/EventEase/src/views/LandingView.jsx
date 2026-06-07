// LandingView.jsx
export default function LandingView({ onStartCreating }) {
  return (
    <div className="relative isolate overflow-hidden bg-[var(--color-bg)]">
      {/* Very subtle background accent shape – using accent-1 at low opacity */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--color-accent-1)] opacity-10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[var(--color-accent-3)] opacity-10 blur-3xl" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 lg:py-32 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-text)]">
          Planiraj srečanja,
          <span className="block mt-1 text-[var(--color-primary)]">
            ne zapletov.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-[var(--color-text)]/70">
          Ustvari dogodek v minuti, deli povezavo in skupaj izberite najboljši termin.
          Brez registracije, brez kaosa.
        </p>
        <div className="mt-10 flex justify-center">
          <button
            onClick={onStartCreating}
            className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-base font-semibold text-[var(--color-on-primary)] shadow-md hover:bg-[var(--color-accent-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] transition-all"
          >
            Ustvari dogodek
          </button>
        </div>
        <p className="mt-6 text-sm text-[var(--color-text)]/50">
          Preprosto. Hitro. Brezplačno.
        </p>
      </div>
    </div>
  );
}