-- Accounts made with Apple / Kakao get a random password nobody knows; pw_set says
-- whether the user chose one (account deletion asks for it only then).
ALTER TABLE users ADD COLUMN pw_set INTEGER NOT NULL DEFAULT 1;
-- Proof photos are looked up by key when someone opens one, to check they share a crew.
CREATE INDEX proofs_by_image ON proofs (image_key);
