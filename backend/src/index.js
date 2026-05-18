import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getAuth } from 'firebase-admin/auth';
import { app as firebaseApp, hasAdminConfig } from './firebaseAdmin.js';
import requireAuth from './middleware/requireAuth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/auth/verify', async (req, res) => {
  if (!hasAdminConfig || !firebaseApp) {
    return res.status(500).json({
      ok: false,
      error: 'Firebase admin config missing. Check backend/.env.',
    });
  }

  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ ok: false, error: 'idToken is required.' });
  }

  try {
    const decoded = await getAuth(firebaseApp).verifyIdToken(idToken);
    return res.json({ ok: true, uid: decoded.uid, claims: decoded });
  } catch (err) {
    return res.status(401).json({ ok: false, error: err?.message || 'Invalid token.' });
  }
});

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ ok: true, uid: req.user.uid, claims: req.user });
});

app.listen(port, () => {
  console.log(`EventEase backend listening on port ${port}`);
});
