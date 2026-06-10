// LandingPage.jsx
import { useState, useEffect } from 'react';
import LandingView from '../views/LandingView';
import CreateEventWizard from './CreateEventPage';
import InviteView from '../views/InviteView';

export default function LandingPage() {
  const [view, setView] = useState('landing');
  const [activeEvent, setActiveEvent] = useState(null);

  useEffect(() => {
    switch (view) {
      case 'landing':
        document.title = 'EventEase';
        break;
      case 'create-wizard':
        document.title = 'Ustvari nov dogodek';
        break;
      default:
        document.title = 'EventEase';
    }
  }, [view, activeEvent]);
  const handleEventCreation = (formData) => {
    const processedTasks = formData.tasks
      ? formData.tasks.split('\n').map(t => t.trim()).filter(t => t.length > 0)
      : [];
    const completeEventPayload = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      description: formData.description,
      suggestedDates: formData.suggestedDates || [],
      tasks: processedTasks,
      organizerName: 'Organizator',
      createdAt: new Date()
    };
    setActiveEvent(completeEventPayload);
    setView('invite-view');
  };

  const navigateHome = (e) => {
    if (e) e.preventDefault();
    setActiveEvent(null);
    setView('landing');
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
            className="theme-logo-light"
            style={{ height: "28px", width: "28px" }}
          />
          <img
            src="/EventEaseIkoncaDark.svg"
            alt="EventEase"
            className="theme-logo-dark"
            style={{ height: "28px", width: "28px" }}
          />

          <span className="text-xl font-semibold tracking-tight">
            <span style={{ color: "var(--color-accent-3)" }}>Event</span>
            <span style={{ color: "var(--color-primary)" }}>Ease</span>
          </span>
        </a>
      </nav>

      <main className="flex-grow">
        {view === 'landing' && <LandingView onStartCreating={() => setView('create-wizard')} />}
        {view === 'create-wizard' && <CreateEventWizard onCancel={navigateHome} onCreate={handleEventCreation} />}
        {view === 'invite-view' && activeEvent && <InviteView eventData={activeEvent} />}
      </main>

      <footer className="py-6 px-4 sm:px-8 border-t border-[var(--color-accent-2)]/20 flex flex-wrap-reverse items-center justify-between gap-4 text-xs text-[var(--color-text)]/60">
        <span>© 2026 EventEase</span>
        
      </footer>
    </div>
  );
}