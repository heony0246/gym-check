-- Crews: small invite-only groups (up to 8) that race on how many days a week each
-- member proves with that day's 오운완 photo.

CREATE TABLE crews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE crew_members (
  crew_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (crew_id, user_id)
);
CREATE INDEX crew_members_by_user ON crew_members (user_id);

-- One proof photo per user per day; it counts in every crew the user is in.
-- image_key is a random R2 key, handed only to people who share a crew.
CREATE TABLE proofs (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  image_key TEXT NOT NULL,
  parts TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE cheers (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  from_id TEXT NOT NULL,
  PRIMARY KEY (user_id, date, from_id)
);

-- Weekly winners, written the first time someone opens the crew after the week ends.
CREATE TABLE crew_wins (
  crew_id TEXT NOT NULL,
  week TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (crew_id, week, user_id)
);
CREATE INDEX crew_wins_by_user ON crew_wins (user_id);
