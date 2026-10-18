-- Existing managed accounts may join explicitly invited households. Registration stays closed.
ALTER TABLE account_sessions ADD COLUMN active_household_id TEXT REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE account_sessions ADD COLUMN context_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE account_sessions ADD COLUMN context_command_id TEXT;
CREATE TABLE household_access (
 household_id TEXT PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version>0),
 operation_id TEXT NOT NULL
);
CREATE TABLE household_invitations (
 id TEXT PRIMARY KEY,
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 recipient_id TEXT NOT NULL REFERENCES adults(id) ON DELETE CASCADE,
 invited_by TEXT NOT NULL REFERENCES adults(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('owner','guardian')),
 token_hash TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 accepted_at INTEGER,
 revoked_at INTEGER,
 accept_command_id TEXT
);
CREATE INDEX household_invite_list ON household_invitations(household_id,created_at);
CREATE TABLE household_membership_audit (
 id TEXT PRIMARY KEY,
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 actor_ref TEXT NOT NULL,
 target_ref TEXT NOT NULL,
 operation TEXT NOT NULL CHECK(operation IN ('create_invite','revoke_invite','accept_invite','change_role','remove_member','leave')),
 created_at INTEGER NOT NULL
);
