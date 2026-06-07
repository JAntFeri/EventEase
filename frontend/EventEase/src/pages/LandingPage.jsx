// LandingPage.jsx
import { useState } from 'react';
import LandingView from '../views/LandingView';
import CreateEventWizard from './CreateEventPage';
import InviteView from '../views/InviteView';

export default function LandingPage() {
  const [view, setView] = useState('landing');
  const [activeEvent, setActiveEvent] = useState(null);

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
          className="text-xl font-semibold tracking-tight text-[var(--color-primary)] hover:opacity-80 transition"
          onClick={navigateHome}
        >
          EventEase
        </a>
      </nav>

      <main className="flex-grow">
        {view === 'landing' && <LandingView onStartCreating={() => setView('create-wizard')} />}
        {view === 'create-wizard' && <CreateEventWizard onCancel={navigateHome} onCreate={handleEventCreation} />}
        {view === 'invite-view' && activeEvent && <InviteView eventData={activeEvent} />}
      </main>

      <footer className="py-6 px-4 sm:px-8 border-t border-[var(--color-accent-2)]/20 flex flex-wrap-reverse items-center justify-between gap-4 text-xs text-[var(--color-text)]/60">
        <span>© 2026 EventEase</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-[var(--color-primary)] transition" onClick={e => e.preventDefault()}>Zasebnost</a>
          <a href="#" className="hover:text-[var(--color-primary)] transition" onClick={e => e.preventDefault()}>Pogoji uporabe</a>
          <a href="#" className="hover:text-[var(--color-primary)] transition" onClick={e => e.preventDefault()}>Kontakt</a>
        </div>
      </footer>
    </div>
  );
}