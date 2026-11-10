const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./db');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.AUTH_SERVICE_URL || 'http://localhost:4001'}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                const name = profile.displayName;
                const avatar_url = profile.photos?.[0]?.value || null;
                const provider_id = profile.id;

                if (!email) {
                    return done(new Error('No email returned from Google. Please grant email permission.'));
                }

                // 1. Try to find by Google provider_id first
                let { rows } = await query(
                    `SELECT id, name, email, role, avatar_url FROM users
                     WHERE provider = 'google' AND provider_id = $1`,
                    [provider_id]
                );

                if (rows.length) {
                    return done(null, rows[0]);
                }

                // 2. Existing account with same email (local or other provider) — link Google
                ({ rows } = await query(
                    `SELECT id, name, email, role, avatar_url FROM users WHERE email = $1`,
                    [email]
                ));

                if (rows.length) {
                    // Link the Google provider_id to the existing account
                    await query(
                        `UPDATE users SET provider_id = $1, avatar_url = COALESCE(NULLIF(avatar_url, ''), $2), is_verified = TRUE WHERE id = $3`,
                        [provider_id, avatar_url, rows[0].id]
                    );
                    return done(null, rows[0]);
                }

                // 3. Brand new user — create account
                ({ rows } = await query(
                    `INSERT INTO users (name, email, provider, provider_id, avatar_url, is_verified, role)
                     VALUES ($1, $2, 'google', $3, $4, TRUE, 'user')
                     RETURNING id, name, email, role, avatar_url`,
                    [name, email, provider_id, avatar_url]
                ));

                return done(null, rows[0]);
            } catch (err) {
                return done(err);
            }
        }
    )
);

module.exports = passport;
