// src/pages/LandingPage.jsx
// Home page: switches between the intro view and the event creation wizard.
import { useState, useEffect } from "react";
import LandingView from "../views/LandingView";
import CreateEventWizard from "./CreateEventPage";

const VIEW_LANDING = "landing";
const VIEW_CREATE = "create-wizard";

const PAGE_TITLES = {
  [VIEW_LANDING]: "EventEase",
  [VIEW_CREATE]: "Ustvari nov dogodek",
};

export default function LandingPage() {
  const [view, setView] = useState(VIEW_LANDING);

  useEffect(() => {
    document.title = PAGE_TITLES[view] ?? "EventEase";
  }, [view]);

  const navigateHome = (e) => {
    if (e) e.preventDefault();
    setView(VIEW_LANDING);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col antialiased text-[var(--color-text)]">
      <nav className="flex items-center justify-between px-4 sm:px-8 h-16 border-b border-[var(--color-accent-2)]/20 bg-[var(--color-bg)]/80 backdrop-blur-sm sticky top-0 z-50">
        <a
          href="#"
          className="flex items-center gap-2 hover:opacity-80 transition"
          onClick={navigateHome}
        >
          <img
            src="/EventEaseIkonca.svg"
            alt="EventEase"
            className="theme-logo-light h-7 w-7"
          />
          <img
            src="/EventEaseIkoncaDark.svg"
            alt="EventEase"
            className="theme-logo-dark h-7 w-7"
          />

          <span className="text-xl font-semibold tracking-tight">
            <span className="text-[var(--color-accent-3)]">Event</span>
            <span className="text-[var(--color-primary)]">Ease</span>
          </span>
        </a>
      </nav>

      <main className="flex-grow">
        {view === VIEW_LANDING && (
          <LandingView onStartCreating={() => setView(VIEW_CREATE)} />
        )}
        {view === VIEW_CREATE && <CreateEventWizard onCancel={navigateHome} />}
      </main>

      <footer className="py-6 px-4 sm:px-8 border-t border-[var(--color-accent-2)]/20 flex flex-wrap-reverse items-center justify-between gap-4 text-xs text-[var(--color-text)]/60">
        <span>© 2026 EventEase</span>
      </footer>
    </div>
  );
}
