const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/**
 * Sign a short-lived access token.
 */
const signAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

/**
 * Sign a long-lived refresh token and store it in Redis.
 */
const signRefreshToken = async (userId) => {
    const token = uuidv4();
    await redis.setex(`refresh:${token}`, REFRESH_TOKEN_EXPIRY_SECONDS, userId);
    return token;
};

/**
 * Verify an access JWT and return the decoded payload.
 * Throws if invalid or expired.
 */
const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Verify a refresh token by checking Redis.
 * Returns the userId or null.
 */
const verifyRefreshToken = async (token) => {
    const userId = await redis.get(`refresh:${token}`);
    return userId || null;
};

/**
 * Blacklist an access token for its remaining TTL.
 */
const blacklistAccessToken = async (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return;
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
            await redis.setex(`blacklist:${token}`, ttl, 'true');
        }
    } catch (_) {
        // ignore decode errors
    }
};

/**
 * Check if an access token has been blacklisted.
 */
const isTokenBlacklisted = async (token) => {
    const val = await redis.get(`blacklist:${token}`);
    return val === 'true';
};

/**
 * Revoke a refresh token.
 */
const revokeRefreshToken = async (token) => {
    await redis.del(`refresh:${token}`);
};

/**
 * Generate a secure random token (for email verification / password reset).
 */
const generateSecureToken = () => uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    blacklistAccessToken,
    isTokenBlacklisted,
    revokeRefreshToken,
    generateSecureToken,
};
