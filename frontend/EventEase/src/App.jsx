// src/App.jsx
import React from 'react';
import LandingPage from './pages/LandingPage';
import "./index.css"; // <-- This must sit right here at the root entry point

export default function App() {
  return (
    <div className="App">
      <LandingPage />
    </div>
  );
}