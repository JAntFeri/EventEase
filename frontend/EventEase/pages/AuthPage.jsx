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

  .auth-wrap {
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
    color: #111; text-decoration: none;
    border: 1px solid #ddd; border-radius: 6px;
    padding: 7px 16px;
    transition: border-color 0.15s, background 0.15s;
  }
  .nav-link:hover { border-color: #aaa; background: #f7f7f7; }

  .auth-hero {
    max-width: 520px; margin: 0 auto; padding: 80px 2.5rem 120px;
  }
  h1 {
    font-family: 'Lora', serif;
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 400; line-height: 1.2;
    letter-spacing: -0.01em; color: #111;
    margin-bottom: 1rem;
  }
  .auth-sub {
    font-size: 1rem; font-weight: 300; line-height: 1.7;
    color: #666; margin-bottom: 2rem;
  }

  .auth-card {
    border: 1px solid #eee; border-radius: 12px;
    padding: 24px; background: #fff;
    display: grid; gap: 12px;
  }
  .btn-primary {
    font-family: 'Geist', sans-serif; font-size: 0.9rem; font-weight: 500;
    color: #fff; background: #111; border: none;
    padding: 11px 16px; border-radius: 6px; cursor: pointer;
    transition: background 0.15s;
  }
  .btn-primary:hover { background: #333; }
  .btn-outline {
    font-family: 'Geist', sans-serif; font-size: 0.9rem; font-weight: 500;
    color: #111; background: #fff; border: 1px solid #ddd;
    padding: 11px 16px; border-radius: 6px; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .btn-outline:hover { border-color: #aaa; background: #f7f7f7; }
  .divider {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center; gap: 12px; color: #aaa; font-size: 0.75rem;
  }
  .divider::before, .divider::after {
    content: ''; height: 1px; background: #eee;
  }
  .helper {
    font-size: 0.8rem; color: #888; line-height: 1.6;
  }

  @media (max-width: 600px) {
    nav, .auth-hero { padding-left: 1.25rem; padding-right: 1.25rem; }
  }
`;

export default function AuthPage() {
  return (
    <div className="auth-wrap">
      <style>{styles}</style>

      <nav>
        <a href="/" className="logo">EventEase</a>
        <a href="/" className="nav-link">Back to home</a>
      </nav>

      <div className="auth-hero">
        <h1>Sign in for teams</h1>
        <p className="auth-sub">
          Use a team account to manage roles, assign tasks, and coordinate meeting dates.
        </p>

        <div className="auth-card">
          <button className="btn-primary">Continue with Google</button>
          <div className="divider">or</div>
          <button className="btn-outline">Continue with email</button>
          <p className="helper">
            Firebase auth will power this flow. We will hook these buttons to Firebase once the
            project is created.
          </p>
        </div>
      </div>
    </div>
  );
}
