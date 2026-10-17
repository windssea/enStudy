-- Administrator-managed families; public registration remains closed.
ALTER TABLE account_credentials ADD COLUMN disabled_at INTEGER;
ALTER TABLE account_credentials ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN (0,1));
ALTER TABLE account_credentials ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE site_admins (
 adult_id TEXT PRIMARY KEY REFERENCES adults(id) ON DELETE CASCADE
);
INSERT INTO site_admins(adult_id) VALUES('admin-adult');
CREATE TABLE account_audit (
 id TEXT PRIMARY KEY,
 actor_id TEXT NOT NULL REFERENCES adults(id),
 target_id TEXT NOT NULL,
 operation TEXT NOT NULL CHECK(operation IN ('create','disable','enable','reset_password','change_password')),
 created_at INTEGER NOT NULL
);
CREATE INDEX account_audit_actor ON account_audit(actor_id,created_at);
