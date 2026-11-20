-- Comments on a crew proof (one user's 오운완 for one day). Visible to people who
-- share a crew with the proof's owner.
CREATE TABLE proof_comments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,   -- whose proof
  date TEXT NOT NULL,      -- which day's proof
  from_id TEXT NOT NULL,   -- who wrote it
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX proof_comments_by_proof ON proof_comments (user_id, date, created_at);
