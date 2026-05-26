// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import InvitePage from './pages/InvitePage'; // The page wrapper we created earlier
import AdminFinalizeView from './views/AdminFinalizeView';
import "./index.css"; 

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Default Home view where CreateEventWizard sits */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Regular user link: matches /invite/1b546da5-9814-435f-8385-ac1a40bcebc0 */}
          <Route path="/invite/:token" element={<InvitePage />} />
          
          {/* Admin link: matches /admin/your-admin-token-here */}
          <Route path="/admin/:adminToken" element={<AdminFinalizeView />} />
          
          
        </Routes>
      </BrowserRouter>
    </div>
  );
}