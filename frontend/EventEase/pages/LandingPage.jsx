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

  nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 2.5rem; height: 60px;
    border-bottom: 1px solid #f0f0f0;
  }
  .logo {
    font-family: 'Lora', serif; font-size: 1.25rem;
    color: #111; text-decoration: none;
  }
  .nav-btn {
    font-family: 'Geist', sans-serif; font-size: 0.875rem; font-weight: 500;
    color: #111; background: none;
    border: 1px solid #ddd; border-radius: 6px;
    padding: 7px 16px; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .nav-btn:hover { border-color: #aaa; background: #f7f7f7; }

  .hero {
    padding: 96px 2.5rem 80px;
    max-width: 680px; margin: 0 auto;
  }
  h1 {
    font-family: 'Lora', serif;
    font-size: clamp(2.25rem, 4vw, 3.25rem);
    font-weight: 400; line-height: 1.15;
    letter-spacing: -0.01em; color: #111;
    margin-bottom: 1.25rem;
  }
  h1 em { font-style: italic; color: #555; }
  .hero-sub {
    font-size: 1.0625rem; font-weight: 300; line-height: 1.75;
    color: #666; max-width: 480px; margin-bottom: 2.5rem;
  }
  .hero-actions { display: flex; gap: 10px; align-items: center; }
  .btn-primary {
    font-family: 'Geist', sans-serif; font-size: 0.9rem; font-weight: 500;
    color: #fff; background: #111; border: none;
    padding: 11px 22px; border-radius: 6px; cursor: pointer;
    transition: background 0.15s;
  }
  .btn-primary:hover { background: #333; }
  .btn-secondary {
    font-family: 'Geist', sans-serif; font-size: 0.9rem; font-weight: 500;
    color: #111; background: #fff; border: 1px solid #ddd;
    padding: 11px 22px; border-radius: 6px; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .btn-secondary:hover { border-color: #aaa; background: #f7f7f7; }
  .btn-friends {
    color: #0f3b34; background: #d9efe9; border: 1px solid #b7dbd1;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn-friends:hover { background: #c6e6de; border-color: #9fcec1; }
  .btn-text {
    font-family: 'Geist', sans-serif; font-size: 0.875rem; font-weight: 300;
    color: #888; background: none; border: none; cursor: pointer;
    transition: color 0.15s;
  }
  .btn-text:hover { color: #111; }

  hr { border: none; border-top: 1px solid #f0f0f0; }

  .section { padding: 72px 2.5rem; max-width: 680px; margin: 0 auto; }
  .section-label {
    font-size: 0.75rem; font-weight: 500; letter-spacing: 0.1em;
    text-transform: uppercase; color: #aaa; margin-bottom: 2rem;
  }
  .steps { display: flex; flex-direction: column; }
  .step {
    display: grid; grid-template-columns: 28px 1fr;
    gap: 1.25rem; padding: 1.5rem 0;
    border-top: 1px solid #f0f0f0;
  }
  .step:last-child { border-bottom: 1px solid #f0f0f0; }
  .step-n { font-size: 0.8rem; font-weight: 400; color: #ccc; padding-top: 3px; }
  .step-title { font-size: 0.9375rem; font-weight: 500; color: #111; margin-bottom: 5px; }
  .step-body { font-size: 0.875rem; font-weight: 300; color: #777; line-height: 1.7; }

  .features-section { padding: 72px 2.5rem; max-width: 680px; margin: 0 auto; }
  h2 {
    font-family: 'Lora', serif; font-size: 1.625rem; font-weight: 400;
    line-height: 1.3; color: #111; margin-bottom: 2rem;
    letter-spacing: -0.01em;
  }
  .feat-list { display: flex; flex-direction: column; }
  .feat-item {
    display: flex; align-items: baseline; justify-content: space-between;
    padding: 14px 0; border-top: 1px solid #f0f0f0; gap: 1rem;
  }
  .feat-item:last-child { border-bottom: 1px solid #f0f0f0; }
  .feat-name { font-size: 0.9rem; font-weight: 400; color: #111; }
  .feat-desc { font-size: 0.875rem; font-weight: 300; color: #999; text-align: right; max-width: 260px; }

  .cta-section {
    background: #f7f7f5; border-radius: 10px;
    padding: 48px 40px;
    max-width: 680px; margin: 0 auto 72px;
  }
  .cta-section h2 { margin-bottom: 0.5rem; }
  .cta-sub { font-size: 0.9rem; font-weight: 300; color: #888; margin-bottom: 1.75rem; line-height: 1.6; }
  .input-row { display: flex; gap: 8px; }
  .email-input {
    flex: 1; font-family: 'Geist', sans-serif; font-size: 0.875rem;
    font-weight: 300; color: #111; background: #fff;
    border: 1px solid #ddd; border-radius: 6px;
    padding: 10px 14px; outline: none;
    transition: border-color 0.15s;
  }
  .email-input::placeholder { color: #bbb; }
  .email-input:focus { border-color: #999; }

  footer {
    padding: 1.5rem 2.5rem; border-top: 1px solid #f0f0f0;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.8rem; font-weight: 300; color: #bbb;
  }
  .footer-links { display: flex; gap: 16px; }
  .footer-links a { color: #bbb; text-decoration: none; }
  .footer-links a:hover { color: #777; }

  @media (max-width: 600px) {
    nav, .hero, .section, .features-section { padding-left: 1.25rem; padding-right: 1.25rem; }
    .cta-section { margin-left: 1.25rem; margin-right: 1.25rem; padding: 32px 24px; }
    .input-row { flex-direction: column; }
    .feat-item { flex-direction: column; gap: 4px; }
    .feat-desc { text-align: left; }
    footer { flex-direction: column; gap: 10px; }
  }
`;

const features = [
  { name: 'Date polls', desc: 'Let the group vote, pick the winner in one click' },
  { name: 'Task delegation', desc: 'Assign and track who is doing what' },
  { name: 'RSVP tracking', desc: 'Know who is coming before the day arrives' },
  { name: 'Calendar sync', desc: 'Export to Google, Apple, or Outlook' },
  { name: 'Email reminders', desc: 'Automated nudges so nothing slips through' },
];

const steps = [
  { n: '01', title: 'Invite your team', body: 'Add members and assign organizer roles. No complex permissions.' },
  { n: '02', title: 'Pick a date', body: 'Run a quick poll or pin a date straight to the calendar.' },
  { n: '03', title: 'Everyone gets notified', body: 'EventEase emails the details and syncs calendars automatically.' },
];

export default function LandingPage() {
  const handleTeamStart = () => {
    window.location.href = '/auth';
  };

  const handleFriendsStart = () => {
    window.location.href = '/meetup';
  };

  return (
    <>
      <style>{styles}</style>

      <nav>
        <a href="#" className="logo">EventEase</a>
        <div className="hero-actions">
          <button className="nav-btn" onClick={handleTeamStart}>Get started for teams</button>
          <button className="nav-btn btn-friends" onClick={handleFriendsStart}>Get started for friends</button>
        </div>
      </nav>

      <div className="hero">
        <h1>Organizing events<br /><em>shouldn't be hard.</em></h1>
        <p className="hero-sub">
          A simple tool for groups and small teams to align on dates, split tasks, and keep everyone in the loop.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={handleTeamStart}>Get started for teams</button>
          <button className="btn-secondary btn-friends" onClick={handleFriendsStart}>Get started for friends</button>
        </div>
      </div>

      <hr />

      <div className="section">
        <p className="section-label">How it works</p>
        <div className="steps">
          {steps.map(s => (
            <div className="step" key={s.n}>
              <span className="step-n">{s.n}</span>
              <div>
                <p className="step-title">{s.title}</p>
                <p className="step-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr />

      <div className="features-section">
        <h2>Everything you need,<br />nothing you don't.</h2>
        <div className="feat-list">
          {features.map(f => (
            <div className="feat-item" key={f.name}>
              <span className="feat-name">{f.name}</span>
              <span className="feat-desc">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-section">
        <h2>Ready to plan<br />your next event?</h2>
        <p className="cta-sub">Free for groups under 50. No credit card needed.</p>
        <div className="input-row">
          <input className="email-input" type="email" placeholder="your@email.com" />
          <button className="btn-primary">Sign up free</button>
        </div>
      </div>

      <footer>
        <span>© 2026 EventEase</span>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </>
  );
}
