const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/sync
 * Called by the frontend after every Firebase sign-in.
 * Creates the user in Postgres if they don't exist yet,
 * or returns the existing profile.
 */
router.post('/sync', authenticate, async (req, res, next) => {
  try {
    const { firebase_uid, email, email_verified, name: firebase_name } = req.user;
    const { name, role = 'user', avatar_url = null } = req.body;

    const displayName = name || firebase_name || email.split('@')[0];

    // UPSERT: insert new user OR update firebase_uid if the email already exists
    // (handles migration from old provider_id schema and repeat sign-ins).
    const { rows } = await query(
      `INSERT INTO users (name, email, firebase_uid, role, avatar_url, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE
         SET firebase_uid  = EXCLUDED.firebase_uid,
             is_verified   = EXCLUDED.is_verified,
             updated_at    = NOW()
       RETURNING id, name, email, role, avatar_url, heritage_interests, is_verified, created_at`,
      [displayName, email, firebase_uid, role, avatar_url, email_verified || false]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
