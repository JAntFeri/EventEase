import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getIdToken,
} from 'firebase/auth';
import { auth, googleProvider, hasConfig } from '../src/firebase/firebaseClient';

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
  .field {
    display: grid; gap: 6px;
  }
  .label {
    font-size: 0.8rem; color: #666;
  }
  .input {
    font-family: 'Geist', sans-serif; font-size: 0.9rem;
    border: 1px solid #ddd; border-radius: 6px;
    padding: 10px 12px; outline: none;
    transition: border-color 0.15s;
  }
  .input:focus { border-color: #999; }
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
  .status {
    font-size: 0.8rem; line-height: 1.6;
    padding: 8px 10px; border-radius: 6px;
  }
  .status.error { color: #8a2a2a; background: #fdecec; border: 1px solid #f5caca; }
  .status.success { color: #1f4b3f; background: #e8f6f1; border: 1px solid #cfe9e0; }

  @media (max-width: 600px) {
    nav, .auth-hero { padding-left: 1.25rem; padding-right: 1.25rem; }
  }
`;

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const showStatus = (type, message) => {
    setStatus({ type, message });
  };

  const verifyBackend = async () => {
    if (!auth?.currentUser) {
      showStatus('error', 'No user session found after sign-in.');
      return;
    }

    try {
      const idToken = await getIdToken(auth.currentUser, true);
      const res = await fetch(`${apiBase}/auth/me`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Backend verification failed.');
      }

      const data = await res.json();
      showStatus('success', `Backend verified. UID: ${data.uid}`);
    } catch (err) {
      showStatus('error', err?.message || 'Backend verification failed.');
    }
  };

  const handleGoogle = async () => {
    if (!hasConfig || !auth || !googleProvider) {
      showStatus('error', 'Firebase config is missing. Add it to your .env file.');
      return;
    }

    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      showStatus('success', 'Signed in successfully. Verifying backend...');
      await verifyBackend();
    } catch (err) {
      showStatus('error', err?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!hasConfig || !auth) {
      showStatus('error', 'Firebase config is missing. Add it to your .env file.');
      return;
    }

    if (!email || !password) {
      showStatus('error', 'Add both email and password to continue.');
      return;
    }

    try {
      setLoading(true);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showStatus('success', 'Signed in successfully. Verifying backend...');
        await verifyBackend();
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showStatus('success', 'Account created. Verifying backend...');
        await verifyBackend();
      }
    } catch (err) {
      showStatus('error', err?.message || 'Email sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

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
          <button className="btn-primary" onClick={handleGoogle} disabled={loading}>
            Continue with Google
          </button>
          <div className="divider">or</div>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn-outline" onClick={handleEmail} disabled={loading}>
            {isLogin ? 'Continue with email' : 'Create account with email'}
          </button>
          <button
            className="btn-outline"
            onClick={() => setIsLogin((prev) => !prev)}
            disabled={loading}
          >
            {isLogin ? 'Need an account? Create one' : 'Have an account? Sign in'}
          </button>
          {status.message && (
            <div className={`status ${status.type}`}>{status.message}</div>
          )}
          <p className="helper">
            Firebase auth powers this flow. Add your config to .env (see .env.example) before
            testing in the browser. Backend base URL can be set with VITE_API_URL.
          </p>
        </div>
      </div>
    </div>
  );
}
