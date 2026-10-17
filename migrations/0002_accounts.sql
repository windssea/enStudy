-- Single administrator access; public registration stays closed.
CREATE TABLE account_credentials (
 adult_id TEXT PRIMARY KEY REFERENCES adults(id) ON DELETE CASCADE,
 username TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 salt TEXT NOT NULL,
 iterations INTEGER NOT NULL CHECK(iterations>=100000)
);
CREATE TABLE account_sessions (
 id TEXT PRIMARY KEY,
 adult_id TEXT NOT NULL REFERENCES adults(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 revoked_at INTEGER
);
CREATE INDEX account_expiry ON account_sessions(expires_at);
ALTER TABLE child_grants ADD COLUMN parent_session_id TEXT REFERENCES account_sessions(id) ON DELETE CASCADE;
CREATE INDEX grants_parent ON child_grants(parent_session_id);
CREATE TABLE login_limits (bucket TEXT PRIMARY KEY,window_start INTEGER NOT NULL,attempts INTEGER NOT NULL);
INSERT INTO adults(id,auth_subject,created_at) VALUES('admin-adult','local-admin',unixepoch()*1000);
INSERT INTO account_credentials VALUES('admin-adult','admin','51ef2a7a7f4dc7efcf740a71fb2e3cac3d0b96baecc47a9eda40226032a0f248','eed7d4be344d4086dc2f672497f00802f370a6441ea2fbcf',100000);
INSERT INTO households VALUES('admin-household','我们的探险家',unixepoch()*1000);
INSERT INTO household_members VALUES('admin-household','admin-adult','owner');
INSERT INTO children(id,household_id,nickname,grade,created_at) VALUES('admin-child-1','admin-household','小探险家',3,unixepoch()*1000);
