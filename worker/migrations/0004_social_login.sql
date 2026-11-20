-- Sign in with Apple / Kakao: the provider's stable user id, linked to one account.
ALTER TABLE users ADD COLUMN apple_sub TEXT;
ALTER TABLE users ADD COLUMN kakao_id TEXT;
CREATE UNIQUE INDEX users_by_apple ON users (apple_sub) WHERE apple_sub IS NOT NULL;
CREATE UNIQUE INDEX users_by_kakao ON users (kakao_id) WHERE kakao_id IS NOT NULL;
