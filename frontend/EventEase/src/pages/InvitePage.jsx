// src/pages/InvitePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import InviteView from './InviteView';

export default function InvitePage() {
  const { token } = useParams(); 
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const response = await fetch(`/api/polls/share/${token}`);
        if (!response.ok) {
          throw new Error('Dogodka ni mogoče najti ali pa je bil izbrisan.');
        }
        const data = await response.json();
        
        // FIX: Extract exactly the first 10 characters "YYYY-MM-DD" safely,
        // ignoring whether the backend separates with a space or a 'T'.
        const formattedSlots = (data.time_slots || []).map(slot => {
          if (!slot.start_time) return null;
          
          // Replaces 'T' or spaces to safely slice out "YYYY-MM-DD"
          const cleanDate = slot.start_time.replace('T', ' ').split(' ')[0]; 
          
          return {
            id: slot.id,
            date: cleanDate // Guaranteed to be "2026-05-13"
          };
        }).filter(Boolean);

        setEventData({
          share_token: token,
          title: data.title,
          description: data.description,
          organizerName: data.organizer_email ? data.organizer_email.split('@')[0] : 'Organizator',
          suggestedDates: formattedSlots, 
          tasks: data.tasks || [],
          votes: data.votes || []
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchEvent();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500 text-sm font-light">
        Nalagam podatke o dogodku...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center px-4">
        <h2 className="text-xl font-serif text-gray-900 mb-2">Ups! Nekaj je šlo narobe</h2>
        <p className="text-sm text-gray-600 max-w-sm font-light">{error}</p>
      </div>
    );
  }

  return <InviteView eventData={eventData} />;
}