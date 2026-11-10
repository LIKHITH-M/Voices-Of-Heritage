-- Voices of Heritage — Auth Service Schema
-- Migration 001: Initial setup

-- Enable pgcrypto for UUID generation (optional fallback)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM: User Roles ────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'researcher', 'guide', 'institution', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── ENUM: Auth Providers ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('local', 'google', 'facebook');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── TABLE: users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255),                  -- NULL for OAuth-only users
  role              user_role DEFAULT 'user',
  provider          auth_provider DEFAULT 'local',
  provider_id       VARCHAR(255),                  -- OAuth provider user ID
  avatar_url        TEXT,
  is_verified       BOOLEAN DEFAULT FALSE,
  heritage_interests TEXT[] DEFAULT '{}',          -- e.g. ['Temples', 'Murals', 'Manuscripts']
  visited_sites     UUID[] DEFAULT '{}',           -- references to heritage site IDs
  bookmarks         UUID[] DEFAULT '{}',
  notification_email BOOLEAN DEFAULT TRUE,
  notification_push  BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

-- ─── TABLE: email_verifications ──────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verif_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verif_user   ON email_verifications(user_id);

-- ─── TABLE: password_resets ───────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON password_resets(token);

-- ─── TABLE: activity_log ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      VARCHAR(100) NOT NULL,    -- e.g. 'viewed_site', 'booked_tour', 'donated'
  entity_type VARCHAR(50),             -- e.g. 'heritage_site', 'tour', 'donation'
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at DESC);

-- ─── Auto-update updated_at trigger ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
