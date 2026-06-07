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
    <div className="min-h-screen bg-white flex flex-col antialiased text-gray-900 select-none">
      <nav className="flex items-center justify-between px-4 sm:px-8 h-16 border-b border-gray-100 bg-white sticky top-0 z-50">
        <a href="#" className="text-lg font-medium text-gray-900 tracking-tight" onClick={navigateHome}>EventEase</a>
      </nav>

      <main className="flex-grow">
        {view === 'landing' && <LandingView onStartCreating={() => setView('create-wizard')} />}
        {view === 'create-wizard' && <CreateEventWizard onCancel={navigateHome} onCreate={handleEventCreation} />}
        {view === 'invite-view' && activeEvent && <InviteView eventData={activeEvent} />}
      </main>

      <footer className="py-6 px-4 sm:px-8 border-t border-gray-100 flex flex-wrap-reverse items-center justify-between gap-4 text-xs font-light text-gray-400">
        <span>© 2026 EventEase</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-gray-600 transition" onClick={e => e.preventDefault()}>Zasebnost</a>
          <a href="#" className="hover:text-gray-600 transition" onClick={e => e.preventDefault()}>Pogoji uporabe</a>
          <a href="#" className="hover:text-gray-600 transition" onClick={e => e.preventDefault()}>Kontakt</a>
        </div>
      </footer>
    </div>
  );
}