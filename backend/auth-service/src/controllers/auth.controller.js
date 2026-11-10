const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const {
    signAccessToken,
    signRefreshToken,
    blacklistAccessToken,
    revokeRefreshToken,
    generateSecureToken,
} = require('../services/token.service');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');

const BCRYPT_ROUNDS = 12;
const VERIFICATION_TTL_HOURS = 24;
const RESET_TTL_HOURS = 1;

// ─── Helper ──────────────────────────────────────────────────
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
};

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('access_token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

// ─── POST /api/auth/register ───────────────────────────────
const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.validatedData;

        // Check duplicate
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const { rows } = await query(
            `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_verified, created_at`,
            [name, email, password_hash, role]
        );
        const user = rows[0];

        // Create email verification token
        const token = generateSecureToken();
        const expires = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
        await query(
            `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
            [user.id, token, expires]
        );

        await sendVerificationEmail(email, name, token);

        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/login ──────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { email, password } = req.validatedData;

        const { rows } = await query(
            'SELECT id, name, email, password_hash, role, is_verified, avatar_url FROM users WHERE email = $1 AND provider = $2',
            [email, 'local']
        );
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (!user.is_verified) {
            return res.status(403).json({
                error: 'Email not verified. Please check your inbox for the verification link.',
            });
        }

        const payload = { id: user.id, email: user.email, role: user.role };
        const accessToken = signAccessToken(payload);
        const refreshToken = await signRefreshToken(user.id);

        setAuthCookies(res, accessToken, refreshToken);

        res.json({
            message: 'Login successful.',
            user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url },
            access_token: accessToken,
        });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/logout ─────────────────────────────────
const logout = async (req, res, next) => {
    try {
        const { token } = req;
        const refreshToken = req.cookies?.refresh_token;

        if (token) await blacklistAccessToken(token);
        if (refreshToken) await revokeRefreshToken(refreshToken);

        res.clearCookie('access_token', cookieOptions);
        res.clearCookie('refresh_token', cookieOptions);

        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/verify-email ──────────────────────────
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.validatedData;

        const { rows } = await query(
            `SELECT ev.user_id, ev.expires_at
       FROM email_verifications ev
       WHERE ev.token = $1`,
            [token]
        );

        if (!rows.length) {
            return res.status(400).json({ error: 'Invalid or already-used verification token.' });
        }

        const { user_id, expires_at } = rows[0];
        if (new Date() > new Date(expires_at)) {
            return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
        }

        await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [user_id]);
        await query('DELETE FROM email_verifications WHERE token = $1', [token]);

        res.json({ message: 'Email verified successfully! You can now log in.' });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/forgot-password ───────────────────────
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.validatedData;

        const { rows } = await query('SELECT id, name FROM users WHERE email = $1', [email]);
        // Always return 200 to prevent email enumeration
        if (!rows.length) {
            return res.json({ message: 'If that email exists, a reset link has been sent.' });
        }

        const { id: user_id, name } = rows[0];
        const token = generateSecureToken();
        const expires = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);

        // Invalidate old tokens
        await query('DELETE FROM password_resets WHERE user_id = $1', [user_id]);
        await query(
            'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user_id, token, expires]
        );

        await sendPasswordResetEmail(email, name, token);

        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/reset-password ────────────────────────
const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.validatedData;

        const { rows } = await query(
            'SELECT user_id, expires_at, used FROM password_resets WHERE token = $1',
            [token]
        );

        if (!rows.length || rows[0].used) {
            return res.status(400).json({ error: 'Invalid or already-used reset token.' });
        }
        if (new Date() > new Date(rows[0].expires_at)) {
            return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
        }

        const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, rows[0].user_id]);
        await query('UPDATE password_resets SET used = TRUE WHERE token = $1', [token]);

        res.json({ message: 'Password reset successfully! You can now log in.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, logout, verifyEmail, forgotPassword, resetPassword };
