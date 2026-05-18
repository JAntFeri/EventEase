import { getAuth } from 'firebase-admin/auth';
import { app as firebaseApp, hasAdminConfig } from '../firebaseAdmin.js';

export default async function requireAuth(req, res, next) {
  if (!hasAdminConfig || !firebaseApp) {
    return res.status(500).json({
      ok: false,
      error: 'Firebase admin config missing. Check backend/.env.',
    });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing Bearer token.' });
  }

  try {
    const decoded = await getAuth(firebaseApp).verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: err?.message || 'Invalid token.' });
  }
}
