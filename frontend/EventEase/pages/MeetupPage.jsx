import React from 'react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=Geist:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Geist', sans-serif;
    background: #fff;
    color: #111;
    -webkit-font-smoothing: antialiased;
  }

  .meetup-wrap {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 2.5rem; height: 60px;
    border-bottom: 1px solid #f0f0f0;
  }
  .logo {
    font-family: 'Lora', serif; font-size: 1.25rem;
    color: #111; text-decoration: none;
  }
  .nav-link {
    font-family: 'Geist', sans-serif; font-size: 0.875rem; font-weight: 500;
    color: #0f3b34; text-decoration: none;
    border: 1px solid #b7dbd1; border-radius: 6px;
    padding: 7px 16px; background: #d9efe9;
    transition: border-color 0.15s, background 0.15s;
  }
  .nav-link:hover { border-color: #9fcec1; background: #c6e6de; }

  .meetup-hero {
    max-width: 520px; margin: 0 auto; padding: 80px 2.5rem 120px;
  }
  h1 {
    font-family: 'Lora', serif;
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 400; line-height: 1.2;
    letter-spacing: -0.01em; color: #111;
    margin-bottom: 1rem;
  }
  .meetup-sub {
    font-size: 1rem; font-weight: 300; line-height: 1.7;
    color: #666; margin-bottom: 2rem;
  }

  .meetup-card {
    border: 1px solid #eee; border-radius: 12px;
    padding: 24px; background: #fff;
  }
  .placeholder {
    font-size: 0.9rem; color: #777; line-height: 1.6;
  }

  @media (max-width: 600px) {
    nav, .meetup-hero { padding-left: 1.25rem; padding-right: 1.25rem; }
  }
`;

export default function MeetupPage() {
  return (
    <div className="meetup-wrap">
      <style>{styles}</style>

      <nav>
        <a href="/" className="logo">EventEase</a>
        <a href="/" className="nav-link">Back to home</a>
      </nav>

      <div className="meetup-hero">
        <h1>Plan with friends</h1>
        <p className="meetup-sub">
          No account needed. Just pick a username, invite friends, and settle on a time.
        </p>

        <div className="meetup-card">
          <p className="placeholder">This flow is next. We will build it after team auth.</p>
        </div>
      </div>
    </div>
  );
}
