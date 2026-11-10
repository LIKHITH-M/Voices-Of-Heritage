const { query } = require('../config/db');

// ─── GET /api/users/profile ────────────────────────────────
const getProfile = async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT id, name, email, role, avatar_url, heritage_interests,
              visited_sites, bookmarks, notification_email, notification_push,
              is_verified, created_at
       FROM users WHERE firebase_uid = $1`,
            [req.user.firebase_uid]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ user: rows[0] });
    } catch (err) {
        next(err);
    }
};

// ─── PUT /api/users/profile ────────────────────────────────
const updateProfile = async (req, res, next) => {
    try {
        const { name, avatar_url, heritage_interests, notification_email, notification_push } =
            req.validatedData || req.body;

        const setClauses = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(name); }
        if (avatar_url !== undefined) { setClauses.push(`avatar_url = $${idx++}`); values.push(avatar_url); }
        if (heritage_interests !== undefined) { setClauses.push(`heritage_interests = $${idx++}`); values.push(heritage_interests); }
        if (notification_email !== undefined) { setClauses.push(`notification_email = $${idx++}`); values.push(notification_email); }
        if (notification_push !== undefined) { setClauses.push(`notification_push = $${idx++}`); values.push(notification_push); }

        if (!setClauses.length) {
            return res.status(400).json({ error: 'No fields to update.' });
        }

        values.push(req.user.firebase_uid);
        const { rows } = await query(
            `UPDATE users SET ${setClauses.join(', ')} WHERE firebase_uid = $${idx}
       RETURNING id, name, email, role, avatar_url, heritage_interests,
                 notification_email, notification_push, updated_at`,
            values
        );

        res.json({ message: 'Profile updated.', user: rows[0] });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/users/activity ───────────────────────────────
const getActivityHistory = async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;

        const { rows } = await query(
            `SELECT al.id, al.action, al.entity_type, al.entity_id, al.metadata, al.created_at
       FROM activity_log al
       JOIN users u ON al.user_id = u.id
       WHERE u.firebase_uid = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
            [req.user.firebase_uid, limit, offset]
        );

        const { rows: countRows } = await query(
            'SELECT COUNT(*) as total FROM activity_log al JOIN users u ON al.user_id = u.id WHERE u.firebase_uid = $1',
            [req.user.firebase_uid]
        );

        res.json({
            activity: rows,
            pagination: {
                total: parseInt(countRows[0].total),
                limit,
                offset,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/users/activity ─── (internal — other services call this)
const logActivity = async (req, res, next) => {
    try {
        const { action, entity_type, entity_id, metadata } = req.body;

        const { rows } = await query(
            `INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata)
       SELECT id, $2, $3, $4, $5 FROM users WHERE firebase_uid = $1
       RETURNING id, action, created_at`,
            [req.user.firebase_uid, action, entity_type || null, entity_id || null, JSON.stringify(metadata || {})]
        );

        res.status(201).json({ activity: rows[0] });
    } catch (err) {
        next(err);
    }
};

module.exports = { getProfile, updateProfile, getActivityHistory, logActivity };
