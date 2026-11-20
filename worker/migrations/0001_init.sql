-- 짐첵 social: accounts with a unique @handle and a password, one-way follows,
-- daily check-ins, 오운완 posts and 🔥 reactions.

-- Passwords are PBKDF2-SHA256 (pw_iter rounds, per-user salt), stored as hex.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pw_iter INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- One row per logged-in device; the device keeps the token, we keep its SHA-256.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_by_user ON sessions (user_id);

-- Wrong-password counter per handle; resets once the window has passed.
CREATE TABLE login_fails (
  handle TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  first_at INTEGER NOT NULL
);

CREATE TABLE follows (
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX follows_by_followee ON follows (followee_id);

-- One row per user per day they checked in; parts are display names (JSON array).
CREATE TABLE days (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  parts TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);
CREATE INDEX days_by_date ON days (date);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  headline TEXT NOT NULL,
  parts TEXT NOT NULL,
  image_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX posts_by_user ON posts (user_id, created_at DESC);
CREATE INDEX posts_by_time ON posts (created_at DESC);

CREATE TABLE fires (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);
