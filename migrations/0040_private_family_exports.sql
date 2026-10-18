-- Short-lived private snapshots; no credentials or capability tokens are copied.
CREATE TABLE family_export_commands (
 id TEXT PRIMARY KEY, household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 adult_id TEXT NOT NULL REFERENCES adults(id) ON DELETE CASCADE,
 session_id TEXT NOT NULL REFERENCES account_sessions(id) ON DELETE CASCADE,
 build_id TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('ready','removed')), created_at INTEGER NOT NULL
);
CREATE TABLE family_exports (
 id TEXT PRIMARY KEY REFERENCES family_export_commands(id) ON DELETE CASCADE,
 household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 adult_id TEXT NOT NULL REFERENCES adults(id) ON DELETE CASCADE,
 session_id TEXT NOT NULL REFERENCES account_sessions(id) ON DELETE CASCADE,
 context_version INTEGER NOT NULL, credential_version INTEGER NOT NULL, build_id TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('building','ready')),
 UNIQUE(household_id,session_id)
);
CREATE INDEX family_exports_expiry ON family_exports(expires_at);
CREATE INDEX family_export_commands_session ON family_export_commands(session_id,created_at);
CREATE INDEX family_export_commands_expiry ON family_export_commands(created_at);
CREATE TABLE family_export_parts (
 export_id TEXT NOT NULL REFERENCES family_exports(id) ON DELETE CASCADE,
 section TEXT NOT NULL, part INTEGER NOT NULL CHECK(part>=0), row_count INTEGER NOT NULL CHECK(row_count BETWEEN 1 AND 25),
 data_json TEXT NOT NULL CHECK(json_valid(data_json) AND length(CAST(data_json AS BLOB))<=524288),
 PRIMARY KEY(export_id,section,part)
);
CREATE TRIGGER family_export_removed AFTER DELETE ON family_exports BEGIN
 UPDATE family_export_commands SET state='removed' WHERE id=OLD.id;
END;
CREATE TRIGGER child_removal_invalidates_exports BEFORE DELETE ON children BEGIN
 DELETE FROM family_exports WHERE household_id=OLD.household_id;
END;
CREATE TRIGGER writing_removal_invalidates_exports BEFORE DELETE ON writing_drafts BEGIN
 DELETE FROM family_exports WHERE household_id=OLD.household_id;
END;
CREATE TRIGGER connection_removal_invalidates_exports BEFORE DELETE ON ai_connections BEGIN
 DELETE FROM family_exports WHERE household_id=OLD.household_id;
END;
CREATE TRIGGER export_session_revoked AFTER UPDATE OF revoked_at ON account_sessions WHEN NEW.revoked_at IS NOT NULL BEGIN
 DELETE FROM family_exports WHERE session_id=NEW.id;
END;
CREATE TRIGGER export_context_changed AFTER UPDATE OF context_version ON account_sessions WHEN NEW.context_version<>OLD.context_version BEGIN
 DELETE FROM family_exports WHERE session_id=NEW.id;
END;
CREATE TRIGGER export_credentials_changed AFTER UPDATE OF credential_version,disabled_at ON account_credentials BEGIN
 DELETE FROM family_exports WHERE adult_id=NEW.adult_id;
END;
CREATE TRIGGER export_member_removed AFTER DELETE ON household_members BEGIN
 DELETE FROM family_exports WHERE household_id=OLD.household_id;
END;
CREATE TRIGGER export_owner_demoted AFTER UPDATE OF role ON household_members WHEN NEW.role<>'owner' BEGIN
 DELETE FROM family_exports WHERE household_id=NEW.household_id AND adult_id=NEW.adult_id;
END;
